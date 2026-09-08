#!/usr/bin/env bash
#
# Hardening da VPS — NÃO execute sem ler.
#
# Este script fecha o acesso por senha ao SSH. Se algo der errado no meio, você
# pode ficar sem acesso ao servidor. Por isso ele:
#   - verifica ANTES se o login por chave funciona
#   - faz backup da configuração
#   - só aplica as mudanças se a verificação passar
#   - deixa uma sessão de segurança aberta enquanto você testa
#
# Uso (na VPS, como root):
#   bash hardening-vps.sh --verificar    # só diagnostica, não muda nada
#   bash hardening-vps.sh --aplicar      # aplica após a verificação passar
#
set -euo pipefail

MODO="${1:---verificar}"
SSHD=/etc/ssh/sshd_config
BACKUP="/root/sshd_config.bak.$(date +%Y%m%d-%H%M%S)"

echo "=== Hardening SSH — modo: $MODO"
echo

# --- 1. o usuário de serviço tem chave instalada? ---
CHAVES_NOBRI=0
if [ -f /home/nobri/.ssh/authorized_keys ]; then
  CHAVES_NOBRI=$(grep -c '^ssh-' /home/nobri/.ssh/authorized_keys 2>/dev/null || echo 0)
fi
CHAVES_ROOT=0
if [ -f /root/.ssh/authorized_keys ]; then
  CHAVES_ROOT=$(grep -c '^ssh-' /root/.ssh/authorized_keys 2>/dev/null || echo 0)
fi

echo "chaves autorizadas para root:  $CHAVES_ROOT"
echo "chaves autorizadas para nobri: $CHAVES_NOBRI"
echo

if [ "$CHAVES_ROOT" -eq 0 ]; then
  echo "!! PERIGO: root não tem nenhuma chave SSH instalada."
  echo "   Desabilitar senha agora deixaria o servidor INACESSÍVEL."
  echo "   Rode na sua máquina antes:  ssh-copy-id root@13.140.175.124"
  exit 1
fi

# --- 2. estado atual da configuração ---
echo "configuração atual:"
grep -E '^\s*#?\s*(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)' "$SSHD" | sed 's/^/   /' || true
echo

# --- 3. firewall ---
if command -v ufw >/dev/null 2>&1; then
  echo "firewall: $(ufw status | head -1)"
else
  echo "firewall: ufw não instalado"
fi
echo

if [ "$MODO" = "--verificar" ]; then
  echo "=== Verificação concluída. Nada foi alterado."
  echo
  echo "Se os números de chaves acima estão corretos, rode:"
  echo "   bash hardening-vps.sh --aplicar"
  echo
  echo "IMPORTANTE: mantenha esta sessão SSH aberta enquanto testa o acesso"
  echo "em um segundo terminal. Se algo falhar, você ainda tem esta sessão."
  exit 0
fi

if [ "$MODO" != "--aplicar" ]; then
  echo "modo desconhecido: use --verificar ou --aplicar"
  exit 1
fi

# --- 4. aplicar ---
echo "=== aplicando (backup em $BACKUP)"
cp "$SSHD" "$BACKUP"

# chave sempre habilitada (garantia antes de fechar a senha)
sed -i 's/^\s*#\?\s*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD"
grep -q '^PubkeyAuthentication' "$SSHD" || echo 'PubkeyAuthentication yes' >> "$SSHD"

sed -i 's/^\s*#\?\s*PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD"
grep -q '^PermitRootLogin' "$SSHD" || echo 'PermitRootLogin prohibit-password' >> "$SSHD"

sed -i 's/^\s*#\?\s*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD"
grep -q '^PasswordAuthentication' "$SSHD" || echo 'PasswordAuthentication no' >> "$SSHD"

# valida a sintaxe ANTES de reiniciar — sshd -t recusa config inválida
if ! sshd -t; then
  echo "!! configuração inválida — restaurando backup e abortando"
  cp "$BACKUP" "$SSHD"
  exit 1
fi

systemctl reload ssh
echo "SSH recarregado (reload, não restart: conexões abertas seguem vivas)"
echo

# --- 5. firewall ---
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  echo "regra OpenSSH liberada no ufw."
  echo "Para ativar o firewall (revise as outras portas antes!):"
  echo "   ufw --force enable"
fi

echo
echo "=== Concluído."
echo "TESTE AGORA em outro terminal, sem fechar esta sessão:"
echo "   ssh -i ~/.ssh/lanup_vps root@13.140.175.124"
echo
echo "Se falhar, restaure com:  cp $BACKUP $SSHD && systemctl reload ssh"
