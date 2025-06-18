#!/bin/bash
cd /home/kavia/workspace/code-generation/goalsaver-59757-c87eace0/goal_saver_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

