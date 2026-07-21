# 07 — Criterios de aceptación

## Criterios globales

- La aplicación abre con `npm run dev`.
- `npm run lint` finaliza sin errores.
- `npm run build` finaliza sin errores.
- No existen errores relevantes en consola.
- No se utiliza `any`.
- No existen imports rotos.
- No existe overflow horizontal.
- Las rutas funcionan.
- La ruta activa se distingue.
- La aplicación es usable en 375 px, 768 px y 1440 px.
- Los textos visibles están en español.
- Los nombres técnicos están en inglés.
- Los mocks son consistentes.
- No se conecta Supabase.
- No se usa `localStorage`.

## Arquitectura

- `App.tsx` no concentra toda la aplicación.
- Las páginas viven en `src/pages`.
- Los componentes reutilizables viven en `src/components`.
- Los mocks viven en `src/data`.
- Los tipos viven en `src/types`.
- Las utilidades viven en `src/utils`.
- El layout principal usa React Router.
- No hay carpetas vacías innecesarias.

## Sistema visual

- Existe jerarquía visual clara.
- Los colores de estados son consistentes.
- Los componentes comparten estilos.
- Los botones tienen estados hover, focus y disabled.
- Los modales son utilizables en móvil.
- Las gráficas son responsivas.
- El resultado no parece una plantilla Vite.
- La interfaz se percibe profesional.

## Dashboard

- Muestra cuatro KPIs.
- Muestra progreso semanal.
- Muestra racha actual.
- Muestra hábitos completados hoy.
- Muestra meta mensual.
- Muestra checklist resumido.
- Muestra al menos dos visualizaciones.
- Muestra hábitos fuertes y débiles.
- Muestra recomendaciones.
- Maneja estado vacío.

## Checklist diario

- Permite navegar entre fechas.
- Permite volver a hoy.
- Permite filtrar por estado.
- Muestra hábitos programados.
- Muestra inputs según tipo.
- Permite cambiar estados mock.
- Permite agregar nota mock.
- Muestra progreso parcial.
- Muestra porcentajes mayores a 100 %.
- Registros mayores a siete días son solo lectura.

## Mis hábitos

- Existen tabs Activos, Pausados, Archivados y Papelera.
- Existe buscador.
- Existen filtros.
- Existe modal de creación.
- Existe modal de edición.
- Existe modal de eliminación.
- El modal de eliminación muestra tres opciones.
- Es posible restaurar visualmente un hábito desde papelera.

## Historial

- Permite filtrar por rango.
- Permite filtrar por hábito.
- Permite filtrar por estado.
- Incluye vista calendario o tabla.
- Identifica registros de solo lectura.
- Muestra resumen del periodo.
- Muestra metas cumplidas.

## Estadísticas

- Muestra cumplimiento diario.
- Muestra cumplimiento semanal.
- Muestra cumplimiento mensual.
- Muestra mejor día.
- Muestra día más débil.
- Muestra racha actual.
- Muestra mejor racha.
- Incluye al menos cuatro visualizaciones.
- Maneja periodos sin datos.

## Metas

- Muestra metas activas.
- Muestra metas cumplidas.
- Muestra metas vencidas.
- Muestra progreso.
- Muestra fecha límite.
- Muestra porcentajes superiores a 100 %.
- Muestra insignias.

## Configuración

- Incluye perfil.
- Incluye zona horaria.
- Incluye inicio de semana.
- Incluye tema.
- Incluye notificaciones.
- Incluye privacidad.
- Incluye cierre de sesión visual.

## Accesibilidad básica

- Botones usan elemento `button`.
- Inputs tienen labels.
- Foco visible.
- Iconos decorativos no interfieren con lectores.
- Modales tienen título.
- Contraste legible.
- Navegación usable con teclado en funciones principales.

## Definition of Done

La primera versión Front-End se considera terminada cuando:

1. Todas las rutas son navegables.
2. Todas las pantallas principales existen.
3. La interfaz es responsiva.
4. Los componentes son reutilizables.
5. Los datos mock son realistas y coherentes.
6. Lint y build pasan.
7. No existen errores relevantes.
8. Puede presentarse como prototipo sólido.
9. Está preparada para integrar Supabase posteriormente.
