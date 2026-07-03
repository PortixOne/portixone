# @portixone/escpos

Construcción de comandos ESC/POS (init, texto, corte, alineación) como buffers de bytes. No incluye comunicación con hardware — eso vive en `runtime/src/printer/drivers`, que consumirá este paquete cuando se implemente el driver real (próxima iteración, hoy `drivers/mock.driver.ts` es un stub).
