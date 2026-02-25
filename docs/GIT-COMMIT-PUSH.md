# O que é Commit e Push (Git)

## Em poucas palavras

- **Commit** = gravar uma “foto” das suas alterações no repositório **no seu PC** (histórico local).
- **Push** = enviar esses commits do seu PC para o **GitHub** (repositório na nuvem).

Assim outras pessoas (ou você em outro lugar, ex.: RunPod) podem dar **pull** e ficar com o mesmo código.

---

## Passo a passo no terminal

### 1. Ver o que mudou
```powershell
git status
```
Mostra arquivos modificados (em vermelho) e preparados para commit (em verde).

### 2. Escolher o que vai no commit
```powershell
git add .                    # adiciona tudo que mudou
# ou
git add deepfake-api/app.py  # só um arquivo
```

### 3. Fazer o commit (gravar no repositório local)
```powershell
git commit -m "Descrição curta do que você fez"
```
Exemplo: `git commit -m "fix: análise em CPU no RunPod"`

### 4. Enviar para o GitHub (push)
```powershell
git push
```
Se for a primeira vez na branch: `git push -u origin main`

---

## Ordem que importa

1. **add** → marca o que entra no próximo commit  
2. **commit** → grava essa “foto” no repositório local  
3. **push** → envia os commits para o GitHub  

Sem **commit**, não há nada para dar **push**. Sem **push**, o GitHub não fica atualizado.

---

## No seu projeto (quando o Git não está no PATH)

Use o caminho completo do Git:
```powershell
& "C:\Program Files\Git\bin\git.exe" add .
& "C:\Program Files\Git\bin\git.exe" commit -m "Sua mensagem"
& "C:\Program Files\Git\bin\git.exe" push
```
