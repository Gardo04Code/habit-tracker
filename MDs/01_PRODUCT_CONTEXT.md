# 01 — Contexto del producto

## Nombre del producto

Habit Tracker

## Visión

Habit Tracker será una aplicación web enfocada en la creación, seguimiento, análisis y mejora de hábitos personales.

Debe permitir que el usuario comprenda rápidamente:

- cómo va hoy;
- qué hábitos tiene pendientes;
- cuál es su racha actual;
- qué hábitos mantiene con mayor constancia;
- cuáles necesita mejorar;
- qué patrones se detectan;
- qué acción debería priorizar.

## Objetivo principal

Convertir el registro de hábitos en una experiencia simple, visual y útil, evitando que el usuario tenga que interpretar grandes cantidades de información.

El Dashboard debe ser útil en menos de 30 segundos.

## Usuario inicial

La primera versión será personal, pero la arquitectura debe quedar preparada para soportar múltiples usuarios en el futuro.

## Navegación principal

```text
Inicio / Dashboard
Checklist diario
Mis hábitos
Historial
Estadísticas
Metas
Configuración
```

## Navegación de escritorio

Se utilizará una Sidebar lateral persistente o sticky.

Debe mostrar:

- logo o nombre del producto;
- rutas principales;
- indicador de ruta activa;
- acceso rápido al perfil;
- posibilidad futura de colapsarse.

## Navegación móvil

Se utilizará una barra inferior con:

```text
Inicio
Checklist
Hábitos
Estadísticas
Más
```

Dentro de `Más`:

- Historial.
- Metas.
- Configuración.

## Conceptos funcionales

### Hábito

Define qué debe realizar el usuario.

Contiene, entre otros:

- nombre;
- descripción opcional;
- categorías;
- icono;
- color;
- frecuencia;
- tipo de meta;
- valor objetivo;
- unidad;
- fecha de inicio;
- estado del hábito.

### Registro diario

Define qué ocurrió con un hábito en una fecha concreta.

Puede contener:

- estado;
- cantidad;
- duración;
- repeticiones;
- hora;
- nota;
- fecha de actualización.

### Meta

Representa un objetivo medible relacionado con uno o varios hábitos.

## Estados de registro diario

```text
Pendiente
Completado
Parcial
No realizado
No aplicable
```

## Estados del ciclo de vida del hábito

```text
Activo
Pausado
Archivado
Eliminado
```

## Tipos de meta

```text
Sí / No
Cantidad
Duración
Repeticiones
Hora límite
Días acumulados
```

## Tipos de frecuencia

```text
Todos los días
Días específicos
X veces por semana
X veces por mes
Una vez
Cada N días
```

## Reglas de negocio relevantes para Front-End

### Creación y edición

- No se permiten hábitos duplicados con el mismo nombre.
- El nombre es obligatorio.
- El nombre admite hasta 150 caracteres.
- La descripción es opcional.
- Un hábito puede pertenecer a múltiples categorías.
- Todos los campos del hábito pueden editarse.

### Registro diario

- Si el usuario supera una meta, se guarda y muestra el valor real.
- Los porcentajes pueden superar 100 %.
- Múltiples registros del mismo día deben acumularse.
- Si no existe registro, el estado permanece como Pendiente.
- Solo pueden editarse registros de los últimos siete días.
- Los registros anteriores son únicamente de consulta.

### Rachas

- Existe un día de tolerancia.
- Dos incumplimientos consecutivos reinician la racha.
- Dos días consecutivos parciales o no completados reinician la racha.
- No aplicable no suma ni rompe la racha.
- Editar registros antiguos no recupera una racha perdida.

### Dashboard y estadísticas

- Los hábitos pausados continúan apareciendo en estadísticas.
- Los hábitos archivados no aparecen en el Dashboard.
- Superar una meta genera una insignia.
- El porcentaje no tiene límite superior.
- Las metas cumplidas continúan visibles.

### Eliminación

El modal de eliminación debe contemplar:

1. Archivar hábito.
2. Eliminar únicamente el hábito.
3. Eliminar hábito y todos sus registros.

Debe existir una vista de papelera para restaurar hábitos eliminados.

### Inteligencia futura

La interfaz debe preparar espacios para:

- alertas de racha en riesgo;
- detección de hábitos abandonados;
- patrones de horario;
- recomendaciones basadas en tendencias;
- relaciones entre hábitos.

En esta fase estas recomendaciones se representarán con datos mock.
