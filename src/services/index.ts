// Punto de entrada único a los servicios de datos. Los componentes/hooks
// deben importar desde aquí (`import { authService } from "../services"`)
// en vez de apuntar a cada archivo directamente, para mantener un solo
// lugar de referencia a medida que se agreguen más servicios.

export { authService } from "./auth.service";
export { profilesService } from "./profiles.service";
export { categoriesService } from "./categories.service";
export { habitsService } from "./habits.service";
export { habitLogsService } from "./habitLogs.service";
export { goalsService } from "./goals.service";
export { habitSchedulesService } from "./habitSchedules.service";
