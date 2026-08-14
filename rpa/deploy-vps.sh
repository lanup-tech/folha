#!/usr/bin/env bash
# Deploy do RPA na VPS — rodar NA VPS, como root, depois do setup-vps.sh.
#
#   bash deploy-vps.sh
#
# Clona (ou atualiza) o repositório, instala dependências, baixa o Chromium e
# valida o agendamento. As credenciais NÃO vêm do git: o .env é enviado à parte
# (ver rpa/README.md).
set -euo pipefail

REPO="${REPO:-https://github.com/lanup-tech/folha.git}"
APP_DIR="/opt/nobri-ponto"
USER_SVC="nobri"

echo "==> 1/5 repositório em $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$USER_SVC" git -C "$APP_DIR" pull --ff-only
else
  install -d -o "$USER_SVC" -g "$USER_SVC" "$APP_DIR"
  sudo -u "$USER_SVC" git clone "$REPO" "$APP_DIR"
fi

echo "==> 2/5 dependências do robô"
cd "$APP_DIR/rpa"
sudo -u "$USER_SVC" npm install --omit=dev --no-audit --no-fund || sudo -u "$USER_SVC" npm install --no-audit --no-fund

echo "==> 3/5 Chromium do Playwright"
sudo -u "$USER_SVC" npx playwright install --with-deps chromium

echo "==> 4/5 conferindo credenciais"
if [ ! -f "$APP_DIR/rpa/.env" ]; then
  echo "  !! ATENÇÃO: $APP_DIR/rpa/.env não existe."
  echo "     Envie da sua máquina:"
  echo "       scp .env.local root@<IP>:$APP_DIR/rpa/.env"
  echo "     e proteja:  chown $USER_SVC:$USER_SVC $APP_DIR/rpa/.env && chmod 600 $APP_DIR/rpa/.env"
else
  chown "$USER_SVC:$USER_SVC" "$APP_DIR/rpa/.env"
  chmod 600 "$APP_DIR/rpa/.env"
  echo "  .env presente e protegido (600)"
fi

echo "==> 5/5 agendamento"
cat >/etc/cron.d/nobri-rpa <<'CRON'
# Ciclo diário 06:00 — Abono (RPA) + carga da API + consolidação da competência
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 6 * * * nobri cd /opt/nobri-ponto/rpa && npx tsx src/ciclo-diario.ts >> /var/log/nobri-rpa.log 2>&1
CRON
chmod 644 /etc/cron.d/nobri-rpa
touch /var/log/nobri-rpa.log && chown "$USER_SVC:$USER_SVC" /var/log/nobri-rpa.log
echo "  cron: /etc/cron.d/nobri-rpa (06:00 diário)"

echo
echo "==> Deploy concluído. Teste manual:"
echo "   sudo -u $USER_SVC bash -c 'cd $APP_DIR/rpa && npx tsx src/collect-abono.ts 2026-08'"
