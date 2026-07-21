# 06 — Roadmap de implementación

## Fase 0 — Inspección

### Objetivo

Comprender el estado real del proyecto antes de modificarlo.

### Acciones

- leer todos los Markdown;
- revisar `package.json`;
- revisar `vite.config.ts`;
- revisar TypeScript;
- revisar ESLint;
- revisar `src`;
- ejecutar `git status`;
- ejecutar `npm install`;
- ejecutar `npm run lint`;
- ejecutar `npm run build`.

### Entregable

Resumen del estado inicial y riesgos detectados.

---

## Fase 1 — Fundamentos

### Acciones

- configurar Tailwind CSS 4;
- limpiar plantilla Vite;
- preparar estilos globales;
- instalar React Router;
- instalar Lucide React;
- instalar Recharts;
- instalar clsx;
- crear estructura base;
- configurar rutas.

### Validación

```bash
npm run lint
npm run build
```

### Commit sugerido

```text
chore: configure frontend foundations
```

---

## Fase 2 — Tipos y mocks

### Acciones

- crear tipos;
- crear categorías;
- crear hábitos;
- crear registros;
- crear metas;
- crear usuario;
- crear recomendaciones;
- validar consistencia.

### Commit sugerido

```text
feat: add typed mock data models
```

---

## Fase 3 — Sistema UI

### Componentes mínimos

```text
Button
IconButton
Card
Badge
StatusBadge
ProgressBar
Modal
Input
TextArea
Select
Toggle
Tabs
EmptyState
SectionHeader
DateSelector
```

### Validación

- variantes;
- foco;
- disabled;
- responsive;
- props tipadas.

### Commit sugerido

```text
feat: build reusable ui system
```

---

## Fase 4 — Layout y navegación

### Acciones

- AppLayout;
- Sidebar;
- TopHeader;
- MobileNavigation;
- menú Más;
- rutas activas;
- responsive.

### Commit sugerido

```text
feat: add responsive application layout
```

---

## Fase 5 — Dashboard

### Acciones

- encabezado;
- KPIs;
- resumen diario;
- checklist resumido;
- gráfica semanal;
- dona;
- heatmap;
- hábitos fuertes;
- hábitos débiles;
- recomendaciones;
- EmptyState.

### Commit sugerido

```text
feat: build dashboard overview
```

---

## Fase 6 — Checklist diario

### Acciones

- navegación por fecha;
- resumen;
- filtros;
- tarjetas;
- inputs;
- estados;
- notas;
- restricción de siete días;
- actualizaciones mock locales.

### Commit sugerido

```text
feat: add daily checklist experience
```

---

## Fase 7 — Mis hábitos

### Acciones

- tabs;
- buscador;
- filtros;
- HabitCard;
- modal crear;
- modal editar;
- modal eliminar;
- papelera;
- restauración mock.

### Commit sugerido

```text
feat: add habits management interface
```

---

## Fase 8 — Historial

### Acciones

- rango;
- filtros;
- calendario;
- tabla;
- solo lectura;
- resumen.

### Commit sugerido

```text
feat: add habit history views
```

---

## Fase 9 — Estadísticas

### Acciones

- KPIs;
- línea;
- barras;
- dona;
- comparación;
- heatmap;
- filtros.

### Commit sugerido

```text
feat: add habit analytics dashboard
```

---

## Fase 10 — Metas

### Acciones

- meta general;
- metas por hábito;
- progreso;
- insignias;
- estados;
- porcentajes mayores a 100 %.

### Commit sugerido

```text
feat: add goals tracking interface
```

---

## Fase 11 — Configuración

### Acciones

- perfil;
- zona horaria;
- inicio de semana;
- apariencia;
- notificaciones;
- privacidad;
- sesión.

### Commit sugerido

```text
feat: add settings experience
```

---

## Fase 12 — Calidad

### Acciones

- revisar móvil;
- revisar tablet;
- revisar escritorio;
- revisar accesibilidad;
- revisar consola;
- revisar imports;
- revisar estados vacíos;
- ejecutar lint;
- ejecutar build.

### Commit sugerido

```text
refactor: polish responsive design and accessibility
```

## Regla de ejecución

Claude puede avanzar sin solicitar permiso entre archivos mientras:

- no necesite credenciales;
- no conecte servicios externos;
- no elimine información;
- no exista una decisión funcional crítica faltante.

Debe detenerse cuando una decisión requiera al Product Owner.
