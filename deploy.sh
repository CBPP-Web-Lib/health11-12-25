rsync -av \
  -e "/usr/bin/ssh" \
  ./html/ cbppapps@vps42437.dreamhostps.com:/home/cbppapps/apps.cbpp.org/health11-12-25/

rsync -av \
  -e "/usr/bin/ssh" \
  ./node/prod/ cbppapps@vps42437.dreamhostps.com:/home/cbppapps/apps.cbpp.org/health11-12-25/js/
