#!/bin/bash
cd server
npm install
node index.js &
cd ..
npm install
npm start &
