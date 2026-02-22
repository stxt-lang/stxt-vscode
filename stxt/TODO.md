# Plugin VSCode
* Markdown de elemento como explicación
* Mejor soporte para schema (validación en editor)
* Mejor soporte para templates (validación en editor)
* Aviso si un template está sobreescrito por un schema
* Tipos ENUM en autocompletar
* Cambio de parseo para documentos a medias
    * Listado de errores
    * Listado de warnings
* Si no encuentra schema dice que no está en templates! Algo más genérico sería deseable
* Unificar parseo de vscode con genérico a partir de errores y warnings
* Al finalizar carga de templates y schemas hacer una recarga por si acaso de validación de documentos abiertos
* Recarga correcta de schema/template al eliminar
* Bloqueo de ficheros (.lock), según configuración para .vscode: Configuration (@stxt .vscode). 
  Mostrará aviso global o algo, y se borrará al salir. También mostrará el usuario (de configuración). Quizá pueda hacers con un plugin externo.
* Colores distintos para documentos con namespace y sin namespace
* Colores distintos para namespace normal y namespace `@`
* Parseo en proyecto node separado

# Sobre STXT
* Revisar documentos
* Revisar especificación
* Pasar cambios a clases java (errores, etc.)
