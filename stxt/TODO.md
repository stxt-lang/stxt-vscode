# Plugin VSCode

* Mostrar errores de validación de cardinalidad en todos los nodos si superan el máximo permitido por el 
  parent. Para esto quizá que los validadores no lancen excepciones, sinó que pasen listado de errores al parser. Cambiar la firma por validate(Node): ParseException[] o Errors[]

* Revisar cómo obtiene los ROOT en autocompletado
* Permitir un nodo ROOT?
* Unificar core/LineIndent y core/LineIndentParse
* Hover para texto. Quizá añadir a observer el añadido de una línea también
* Goto (click) para ir a la definición del schema

* Revisar getChildrenByName! No tiene en cuenta namespaces!!

* Colores distintos para documentos con namespace y sin namespace
* Colores distintos para namespace normal y namespace `@`
* Colores dentro de los template, para ver mejor el contenido

* Parseo en proyecto node separado

# Sobre STXT
* Revisar documentos
* Revisar especificación
* Pasar cambios a clases java (errores, etc.)
