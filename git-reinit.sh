#!/bin/bash

cd ~/dev/multirepo/ia/services/post-api/
git init
git remote add google ssh://igorparrabastias@gmail.com@source.developers.google.com:2022/p/incidentes-aislados-5/r/post-api-repo
git add . && git ci -m "Reinit git repo" && git push google master -f
git cob $NODE_ENV
# git push google $NODE_ENV -f peligroso opq gatilla deployment inmediato!