# 04 — Especificación de pantallas

## 1. Dashboard

### Objetivo

Mostrar el estado general del usuario en menos de 30 segundos.

### Encabezado

Debe mostrar:

- saludo;
- nombre del usuario;
- fecha;
- avatar;
- acceso a notificaciones.

### KPIs

1. Cumplimiento semanal.
2. Racha actual.
3. Hábitos completados hoy.
4. Meta mensual.

Cada KPI debe incluir:

- icono;
- valor;
- etiqueta;
- tendencia o comparación;
- tooltip o texto auxiliar cuando corresponda.

### Secciones

- resumen de hoy;
- checklist resumido;
- progreso semanal;
- dona por estados;
- calendario de consistencia;
- hábitos más fuertes;
- hábitos por mejorar;
- recomendaciones.

### Interacciones

- abrir Checklist desde el resumen;
- abrir un hábito;
- navegar a Estadísticas;
- ocultar o marcar una recomendación mock.

### Estados

- con datos;
- sin hábitos;
- sin registros del día;
- carga simulada opcional.

---

## 2. Checklist diario

### Objetivo

Permitir registrar los hábitos programados para una fecha.

### Elementos

- selector de fecha;
- botón día anterior;
- botón día siguiente;
- botón volver a hoy;
- filtro por estado;
- resumen de completados;
- lista de hábitos.

### Tarjeta de hábito

Debe mostrar:

- icono;
- nombre;
- categoría;
- meta;
- progreso;
- estado;
- frecuencia;
- input apropiado;
- nota;
- acciones rápidas.

### Input por tipo

- Sí / No: botones.
- Cantidad: campo numérico.
- Duración: minutos u horas.
- Repeticiones: campo numérico.
- Hora límite: selector de hora.
- Días acumulados: registro de avance.

### Reglas visuales

- valores superiores a la meta muestran porcentaje real;
- registros parciales muestran avance;
- registros mayores a siete días aparecen bloqueados;
- no aplicable no debe verse como error;
- los registros del mismo día pueden sumarse de manera visual mock.

---

## 3. Mis hábitos

### Objetivo

Administrar el ciclo de vida de hábitos.

### Header

- título;
- descripción breve;
- buscador;
- filtros;
- botón Crear hábito.

### Tabs

```text
Activos
Pausados
Archivados
Papelera
```

### HabitCard

Debe mostrar:

- icono y color;
- nombre;
- categorías;
- meta;
- frecuencia;
- estado;
- cumplimiento reciente;
- menú de acciones.

### Acciones

```text
Editar
Pausar
Reactivar
Archivar
Eliminar
Restaurar
```

### Modal de creación y edición

Secciones:

1. Datos básicos.
2. Categorías.
3. Frecuencia.
4. Tipo de meta.
5. Valor y unidad.
6. Fecha de inicio.
7. Apariencia.
8. Configuración adicional.

Validaciones visuales:

- nombre obligatorio;
- máximo 150 caracteres;
- evitar duplicados mock;
- meta coherente;
- frecuencia válida.

### Modal de eliminación

Debe mostrar tres opciones:

1. Archivar.
2. Eliminar solo el hábito.
3. Eliminar hábito y registros.

La tercera opción debe verse como destructiva.

---

## 4. Historial

### Objetivo

Consultar registros anteriores.

### Filtros

- rango de fechas;
- hábito;
- categoría;
- estado;
- vista calendario o tabla.

### Vistas

#### Calendario

- color por cumplimiento;
- detalle al seleccionar día;
- indicadores de meta cumplida;
- leyenda.

#### Tabla

Columnas sugeridas:

```text
Fecha
Hábito
Estado
Valor
Meta
Porcentaje
Nota
Edición
```

Registros mayores a siete días:

- solo lectura;
- candado;
- tooltip explicativo.

### Resumen

- porcentaje del periodo;
- días completos;
- días parciales;
- metas cumplidas.

---

## 5. Estadísticas

### Objetivo

Analizar comportamiento histórico y tendencias.

### KPIs

- cumplimiento diario;
- semanal;
- mensual;
- mejor día;
- día más débil;
- racha actual;
- mejor racha.

### Gráficas

- línea de evolución;
- barras por día;
- dona por estado;
- comparación por hábito;
- heatmap de consistencia.

### Filtros

- periodo;
- hábito;
- categoría.

### Estados

- con datos;
- periodo sin datos;
- hábito sin historial suficiente.

---

## 6. Metas

### Objetivo

Mostrar y administrar objetivos.

### Contenido

- meta mensual general;
- metas por hábito;
- progreso;
- valor actual;
- objetivo;
- fecha límite;
- estado;
- insignia si supera 100 %.

### Estados

```text
Activa
Cumplida
Vencida
```

Las metas cumplidas deben permanecer visibles.

### Acciones

- crear meta;
- editar;
- pausar;
- finalizar;
- ver detalle.

En esta fase pueden ser interacciones mock.

---

## 7. Configuración

### Secciones

#### Perfil

- nombre;
- correo visual;
- avatar.

#### Preferencias

- zona horaria;
- inicio de semana;
- formato de hora;
- idioma visual.

#### Apariencia

- claro;
- oscuro;
- sistema.

#### Notificaciones

- racha en riesgo;
- hábito abandonado;
- resumen semanal;
- recordatorios.

#### Privacidad

- exportación futura;
- eliminación de cuenta futura.

#### Sesión

- cerrar sesión visual.

## Estados vacíos globales

Cada pantalla debe tener un EmptyState coherente con una llamada a la acción.
