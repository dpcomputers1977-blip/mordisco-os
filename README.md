# Mordisco OS

Sistema web de **Mordisco Fast Food**, conectado a Supabase.

## Funciones incluidas

- Menú público desde Supabase.
- Categorías y buscador.
- Carrito y pedidos en línea.
- Envío opcional por WhatsApp.
- Inicio de sesión de administrador.
- Crear, editar, ocultar y eliminar productos.
- Subir, cambiar y quitar imágenes.
- Configuración del negocio.
- Consulta y actualización de pedidos.
- Datos sincronizados desde cualquier computador.

## Estructura

```text
mordisco-os/
├── public/                 Aplicación lista para publicar
├── supabase/               Scripts de base de datos y Storage
├── .github/workflows/      Publicación automática opcional
├── package.json
├── vercel.json
└── README.md
```

## Publicar sin instalar nada

### Cloudflare Pages

1. Crea un proyecto en **Workers & Pages**.
2. Selecciona **Direct Upload**.
3. Sube el contenido de la carpeta `public`, o el ZIP preparado para producción.
4. Usa un nombre como `mordisco-fast-food`.

### Vercel con GitHub

1. Crea un repositorio llamado `mordisco-os`.
2. Sube todos los archivos de este proyecto.
3. En Vercel selecciona **Add New → Project**.
4. Importa el repositorio.
5. Configura:
   - Framework preset: `Other`
   - Output directory: `public`
6. Pulsa **Deploy**.

## Administración

Abre la página, pulsa **Administrar** e inicia sesión con el usuario creado en Supabase.

## Seguridad

La aplicación usa una **Publishable key**, diseñada para uso público en el navegador. La protección real está en las políticas RLS de Supabase.

Nunca publiques una clave `sb_secret_` ni una clave `service_role`.
