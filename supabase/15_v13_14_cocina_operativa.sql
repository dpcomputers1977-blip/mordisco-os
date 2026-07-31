-- MORDISCO OS V13.14 — COCINA OPERATIVA Y SESIONES SEGURAS
-- Ejecutar completo en Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.staff_sessions(
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  last_used_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_staff_sessions_staff on public.staff_sessions(staff_id);
create index if not exists idx_staff_sessions_expires on public.staff_sessions(expires_at);

alter table public.staff_sessions enable row level security;
-- No se crean políticas públicas: solo las funciones SECURITY DEFINER acceden a esta tabla.

create or replace function public.employee_login(
  p_staff_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  employee public.staff%rowtype;
  raw_token text;
  token_digest text;
  expiry timestamptz;
begin
  select * into employee
  from public.staff
  where id=p_staff_id
    and active=true
    and pin_hash=extensions.crypt(p_pin,pin_hash);

  if employee.id is null then
    return jsonb_build_object('ok',false);
  end if;

  delete from public.staff_sessions
  where expires_at<now()
     or revoked_at is not null;

  raw_token:=encode(extensions.gen_random_bytes(32),'hex');
  token_digest:=encode(extensions.digest(raw_token,'sha256'),'hex');
  expiry:=now()+interval '12 hours';

  insert into public.staff_sessions(staff_id,token_hash,expires_at)
  values(employee.id,token_digest,expiry);

  return jsonb_build_object(
    'ok',true,
    'token',raw_token,
    'staff_id',employee.id,
    'name',employee.name,
    'role',employee.role,
    'expires_at',expiry
  );
end;
$$;

revoke all on function public.employee_login(uuid,text) from public;
grant execute on function public.employee_login(uuid,text) to anon,authenticated;

create or replace function public.kitchen_update_order(
  p_session_token text,
  p_order_id uuid,
  p_new_status text
)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  employee public.staff%rowtype;
  current_status text;
  token_digest text;
begin
  token_digest:=encode(extensions.digest(p_session_token,'sha256'),'hex');

  select s.* into employee
  from public.staff_sessions ss
  join public.staff s on s.id=ss.staff_id
  where ss.token_hash=token_digest
    and ss.revoked_at is null
    and ss.expires_at>now()
    and s.active=true
    and s.role in ('kitchen','admin')
  limit 1;

  if employee.id is null then
    raise exception 'Sesión de Cocina inválida o vencida';
  end if;

  select status into current_status
  from public.orders
  where id=p_order_id
  for update;

  if current_status is null then
    raise exception 'El pedido no existe';
  end if;

  if not (
    (current_status in ('pending','confirmed') and p_new_status in ('preparing','cancelled'))
    or (current_status='preparing' and p_new_status='ready')
    or (current_status='ready' and p_new_status='delivered')
  ) then
    raise exception 'Cambio de estado no permitido: % → %',current_status,p_new_status;
  end if;

  update public.orders
  set status=p_new_status
  where id=p_order_id;

  update public.staff_sessions
  set last_used_at=now()
  where token_hash=token_digest;

  -- Reflejar el avance en Mesas.
  update public.restaurant_tables t
  set status=case
      when p_new_status='preparing' then 'preparing'
      when p_new_status='ready' then 'payment'
      when p_new_status='delivered' then
        case
          when exists(
            select 1 from public.orders o
            where o.id=p_order_id and o.payment_status='paid'
          ) then 'free'
          else 'payment'
        end
      else t.status
    end,
    updated_at=now()
  where t.current_order_id=p_order_id;

  return true;
end;
$$;

revoke all on function public.kitchen_update_order(text,uuid,text) from public;
grant execute on function public.kitchen_update_order(text,uuid,text) to anon,authenticated;
