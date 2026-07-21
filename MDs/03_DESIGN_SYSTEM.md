# 03 — Sistema visual

## Personalidad visual

Habit Tracker debe sentirse:

- moderno;
- limpio;
- profesional;
- amigable;
- motivador;
- sereno;
- fácil de leer.

No debe parecer:

- una plantilla genérica;
- una aplicación infantil;
- un panel administrativo corporativo frío;
- una pantalla saturada de gráficas.

## Principios

1. La información prioritaria debe destacar.
2. Cada pantalla debe tener una acción principal clara.
3. Los colores deben comunicar estado.
4. Las tarjetas deben mantener consistencia.
5. Las gráficas deben complementar, no dominar.
6. El usuario debe comprender el Dashboard en menos de 30 segundos.
7. El diseño móvil no debe ser una versión comprimida del escritorio.

## Paleta sugerida

### Superficies

- Fondo principal: gris azulado muy claro.
- Tarjetas: blanco.
- Superficie secundaria: gris muy claro.
- Bordes: gris azulado suave.

### Texto

- Principal: azul grisáceo oscuro.
- Secundario: gris medio.
- Deshabilitado: gris claro.

### Acentos

- Primario: azul.
- Éxito: verde.
- Parcial: ámbar.
- Error o no realizado: rojo suave.
- No aplicable: gris.
- Metas: violeta.
- Rachas: naranja.

## Tokens recomendados

Centralizar tokens mediante Tailwind y CSS variables cuando resulte conveniente:

```css
:root {
  --background: #f5f7fb;
  --surface: #ffffff;
  --surface-muted: #eef2f7;
  --text-primary: #172033;
  --text-secondary: #667085;
  --border: #dfe5ec;
  --primary: #4f6df5;
  --success: #2eaf76;
  --warning: #e5a437;
  --danger: #dc6673;
  --purple: #7c5ce7;
  --streak: #f08a3c;
}
```

Los valores pueden ajustarse manteniendo la intención.

## Tipografía

Usar fuente del sistema o una fuente ya disponible.

Jerarquía:

- H1: título de pantalla.
- H2: título de sección.
- Métrica: valor grande y destacado.
- Etiqueta: texto secundario.
- Ayuda: texto pequeño.

## Componentes visuales

### Tarjetas

- Borde redondeado amplio.
- Borde sutil.
- Sombra ligera.
- Padding coherente.
- Espacio suficiente.
- Sin sombras fuertes.

### Botones

Variantes:

```text
Primary
Secondary
Ghost
Danger
```

Estados:

```text
Default
Hover
Focus
Disabled
Loading
```

### Badges

Usar para:

- estado;
- porcentaje;
- categoría;
- racha;
- meta superada.

### ProgressBar

Debe soportar:

- valores menores a 100 %;
- 100 %;
- valores superiores a 100 %;
- etiqueta opcional;
- variante por estado.

### Modales

- fondo oscurecido;
- cierre con botón;
- cierre con Escape cuando sea posible;
- foco visible;
- contenido desplazable en móvil;
- acción primaria y secundaria.

## Estados

### Pendiente

- azul grisáceo.
- icono de reloj o círculo.

### Completado

- verde.
- icono check.

### Parcial

- ámbar.
- barra de progreso visible.

### No realizado

- rojo suave.
- icono X.

### No aplicable

- gris.
- icono menos.

### Meta superada

- violeta o combinación con éxito.
- insignia.
- porcentaje real.

## Responsive

### Escritorio — 1280 px o más

- Sidebar visible.
- Contenedor central amplio.
- KPIs en cuatro columnas.
- Dashboard en dos columnas.
- Gráficas de mayor tamaño.

### Tablet — 768 a 1279 px

- Sidebar compacta o drawer.
- KPIs en dos columnas.
- Secciones apiladas.
- Tablas adaptadas.

### Móvil — menos de 768 px

- navegación inferior.
- Sidebar oculta.
- KPIs en una o dos columnas según ancho.
- tarjetas apiladas.
- tablas convertidas en tarjetas.
- modales de ancho completo.
- botones con área táctil suficiente.
- evitar overflow horizontal.

## Modo oscuro

No es obligatorio completarlo en esta etapa.

Sí debe:

- evitar valores hardcoded repetidos;
- preparar tokens;
- incluir un control visual en Configuración;
- permitir implementación futura sin rehacer componentes.

## Iconografía

Utilizar Lucide React.

No mezclar múltiples librerías de iconos.
