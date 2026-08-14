#!/usr/bin/env bash
# Provisionamento da VPS para o RPA do Abono de Faltas (Ubuntu/Debian).
#
# Rodar COMO ROOT na VPS, uma única vez:
#   bash setup-vps.sh
#
# O que faz:
#   1. atualiza o sistema e instala Node 22 + dependências do Chromium
#   2. cria o usuário 'nobri' (o robô NÃO roda como root)
#   3. prepara /opt/nobri-ponto e o agendamento diário
#
# O hardening do SSH (chave + desabilitar senha) está no fim, comentado:
# execute só depois de confirmar que sua chave pública funciona, para não
# se trancar para fora do servidor.
set -euo pipefail

echo "==> 1/4 sistema e dependências"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ca-certificates unattended-upgrades

# Node 22 (NodeSource)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node --version

echo "==> 2/4 usuário de serviço 'nobri'"
if ! id nobri >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" nobri
fi

echo "==> 3/4 diretório da aplicação"
install -d -o nobri -g nobri /opt/nobri-ponto
# Coloque aqui o clone do repositório (repo privado: use deploy key ou token):
#   sudo -u nobri git clone git@github.com:lanup-tech/folha.git /opt/nobri-ponto
# Depois:
#   cd /opt/nobri-ponto/rpa && sudo -u nobri npm install
#   sudo -u nobri npx playwright install chromium --with-deps
#   copie o .env para /opt/nobri-ponto/rpa/.env (chmod 600, dono nobri)

echo "==> 4/4 agendamento diário (06:00)"
cat >/etc/cron.d/nobri-rpa <<'CRON'
# Coleta diária do Abono de Faltas -> Supabase
0 6 * * * nobri cd /opt/nobri-ponto/rpa && /usr/bin/npm run collect >> /var/log/nobri-rpa.log 2>&1
CRON
chmod 644 /etc/cron.d/nobri-rpa
touch /var/log/nobri-rpa.log && chown nobri:nobri /var/log/nobri-rpa.log

cat <<'FIM'

==> Provisionamento concluído.

PRÓXIMOS PASSOS MANUAIS (segurança — faça nesta ordem):

 1. Trocar a senha do root (a atual circulou em texto claro):
      passwd

 2. Instalar sua chave SSH para o usuário nobri (rode NA SUA MÁQUINA):
      ssh-copy-id nobri@<IP_DA_VPS>

 3. Testar o login por chave em outro terminal ANTES do passo 4:
      ssh nobri@<IP_DA_VPS>

 4. Só então desabilitar login por senha e por root:
      sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
      sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/'  /etc/ssh/sshd_config
      systemctl restart ssh

 5. Firewall (libera só SSH):
      ufw allow OpenSSH && ufw --force enable

FIM
