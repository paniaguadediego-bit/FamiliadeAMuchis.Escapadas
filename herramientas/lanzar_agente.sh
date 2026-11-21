#!/usr/bin/env bash
# Lanza un agente de OpenCode con una tarea escrita en un archivo y guarda la salida.
# Uso: herramientas/lanzar_agente.sh <agente> <tema> [modelo]
#   Lee tareas/<agente>_<tema>.md, escribe logs/<agente>_<tema>.log y enseña las últimas 15 líneas.
#   Modelo por defecto: el de la definición del agente (.opencode/agents/<agente>.md).
set -u
cd "$(dirname "$0")/.."
agente="${1:?Falta el agente (explorador, editor, versionador, probador, investigador, vigia)}"; tema="${2:?Falta el tema}"
tarea="tareas/${agente}_${tema}.md"; log="logs/${agente}_${tema}.log"
[ -f ".opencode/agents/${agente}.md" ] || { echo "No existe el agente ${agente}"; exit 2; }
[ -f "$tarea" ] || { echo "No existe la tarea $tarea"; exit 2; }
mkdir -p logs
modelo=(); [ -n "${3:-}" ] && modelo=(-m "$3")
opencode run --agent "$agente" "${modelo[@]}" --auto --archived --title "$agente $tema" "$(cat "$tarea")" > "$log" 2>&1
estado=$?
sed -i 's/\x1b\[[0-9;]*m//g' "$log"   # quita colores
if grep -qi "usage limit\|rate limit\|quota" "$log"; then
  echo "⚠️ Cuota del modelo gratuito agotada. Prueba otro: $0 $agente $tema opencode/big-pickle (sin imágenes)"
  echo "   o opencode/nemotron-3.5-super-vl-free (con imágenes)."
fi
tail -n 15 "$log"
exit $estado
