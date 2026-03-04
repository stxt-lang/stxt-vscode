# Plugin VSCode
* Mostrar línea correcta en errores de parseo de templates
* ENUM sin mayúsculas, minúsculas, etc. como los nombres de namespace
* ENUM no repetidos si permitimos eso de mayúsculas, minúsculas,...
* Metaschema: enum de valores de tipo disponibles

* Dependiendo del schema no mostrar nodos que ya tienen superado el máximo permitido, por lo que irán desapareciendo a medida que esté completo
* Mostrar errores de validación de cardinalidad en todos los nodos si superan el máximo permitido por el parent.
  Para esto quizá que los validadores no lancen excepciones, sinó que pasen listado de errores al parser.
  Cambiar la firma por validate(Node): ParseException[] o Errors[]

* Revisar cómo obtiene los ROOT en autocompletado
* Permitir un nodo ROOT?
* Unificar core/LineIndent y core/LineIndentParse
* Hover para texto. Quizá añadir a observer el añadido de una línea también
* Goto (click) para ir a la definición del schema

* Colores distintos para documentos con namespace y sin namespace
* Colores distintos para namespace normal y namespace `@`
* Colores dentro de los template, para ver mejor el contenido

* Parseo en proyecto node separado

# Sobre STXT
* Revisar documentos
* Revisar especificación
* Pasar cambios a clases java (errores, etc.)
