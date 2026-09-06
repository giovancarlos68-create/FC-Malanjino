# FC Malanjino — Casting 2026

## Acesso administrativo por código OTP

O painel reconhece **somente** `giovancarlos68@gmail.com` como administrador.

Fluxo:
1. Digitar `giovancarlos68@gmail.com`.
2. Clicar em **Enviar código**.
3. Receber um código de 6 dígitos no e-mail.
4. Digitar o código no campo **Código de segurança**.
5. O sistema verifica o OTP no Supabase.
6. O sistema confirma o e-mail e a linha ativa em `casting_admins` antes de abrir o painel.

## Configuração obrigatória no Supabase

O Supabase envia Magic Link por padrão. Para receber código OTP, vá em:

**Authentication → Email Templates → Magic Link**

Substitua o conteúdo por algo como:

```html
<h2>Código de acesso — FC Malanjino</h2>
<p>Use o código abaixo para entrar na Área Técnica:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px">{{ .Token }}</p>
<p>Se não solicitou este código, ignore este e-mail.</p>
```

O ponto essencial é usar `{{ .Token }}` e não `{{ .ConfirmationURL }}`. O primeiro gera o OTP de 6 dígitos; o segundo gera Magic Link.

Depois de salvar o template, o botão **Enviar código** do site usa `signInWithOtp({ shouldCreateUser:false })` e o campo de código usa `verifyOtp({ email, token, type:'email' })`.

## Segurança

Não colocar service-role key no frontend. A aplicação usa apenas a chave publicável do projeto. A autorização do painel continua protegida por `casting_admins` + RLS.
