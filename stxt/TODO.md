# Plugin VSCode
* Parse description en templates
* ENUM sin mayúsculas, minúsculas, etc. como los nombres de namespace
* ENUM no repetidos si permitimos eso de mayúsculas, minúsculas,...
* Metaschema: enum de valores de tipo disponibles
* Colores distintos para documentos con namespace y sin namespace
* Colores distintos para namespace normal y namespace `@`
* Revisar cómo obtiene los ROOT en autocompletado
* Permitir un nodo ROOT?
* Dependiendo del schema no mostrar nodos que ya tienen superado el máximo permitido, por lo que irán desapareciendo a medida que esté completo
* Hover para texto. Quizá añadir a observer el añadido de una línea también
* Goto (click) para ir a la definición del schema
* Unificar core/LineIndent y core/LineIndentParse
* Parseo en proyecto node separado
* Mostrar errores de validación de cardinalidad en todos los nodos si superan el máximo permitido por el parent.
  Para esto quizá que los validadores no lancen excepciones, sinó que pasen listado de errores al parser.
  Cambiar la firma por validate(Node): ParseException[] o Errors[]
* Colores dentro de los template, para ver mejor el contenido

# Sobre STXT
* Revisar documentos
* Revisar especificación
* Pasar cambios a clases java (errores, etc.)
