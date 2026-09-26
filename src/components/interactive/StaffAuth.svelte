<script lang="ts">
  import { onMount } from 'svelte';
  import {
    checkStaff,
    loginStaff,
    loginStaffPassword,
    getErrorMessage,
  } from '@/lib/api';
  import {
    saveStaffCheck,
    getStaffCheck,
    clearStaffCheck,
    saveStaffLogin,
    type StaffCheckPayload,
  } from '@/lib/session';
  import { formatCpf, formatPhone } from '@/lib/utils';

  type AuthMode = 'otp' | 'password';
  let mode: AuthMode = 'otp';

  // State: OTP Flow
  let step: 'identifier' | 'otp' = 'identifier';
  let identifier: string = '';
  let otpCode: string = '';
  let checkPayload: StaffCheckPayload | null = null;
  let cooldownSeconds: number = 0;
  let cooldownInterval: any = null;

  // State: Password Flow
  let masterIdentifier: string = '';
  let masterPassword: string = '';

  // Common UI State
  let loading: boolean = false;
  let errorMsg: string | null = null;

  onMount(() => {
    const cached = getStaffCheck();
    if (cached && cached.external_id && cached.found) {
      checkPayload = cached;
      step = 'otp';
      if (cached.otp_wait && cached.otp_wait > 0) {
        startCooldown(cached.otp_wait);
      }
    }
  });

  function startCooldown(seconds: number) {
    cooldownSeconds = seconds;
    if (cooldownInterval) clearInterval(cooldownInterval);
    cooldownInterval = setInterval(() => {
      cooldownSeconds -= 1;
      if (cooldownSeconds <= 0) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
    }, 1000);
  }

  function handleIdentifierInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const digits = target.value.replace(/\D/g, '');
    errorMsg = null;

    if (digits.length <= 11) {
      // Formata dinamicamente como telefone ou CPF
      if (digits.length === 11 && digits.startsWith('0')) {
        identifier = formatCpf(digits);
      } else {
        identifier = formatPhone(digits);
      }
    }

    if (digits.length === 11 && !loading) {
      submitCheck(digits);
    }
  }

  async function submitCheck(cleanDigits?: string) {
    const raw = cleanDigits || identifier.replace(/\D/g, '');
    if (raw.length < 10) {
      errorMsg = 'Informe um CPF ou telefone com DDD válido (10 ou 11 dígitos).';
      return;
    }

    loading = true;
    errorMsg = null;

    try {
      const isCpf = raw.length === 11 && !['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(raw[2]);
      const res = await checkStaff({
        cpf: isCpf ? raw : undefined,
        phone: !isCpf ? raw : undefined,
      });

      if (!res.found || !res.external_id) {
        errorMsg = 'Acesso restrito. Este usuário não possui privilégios de staff/administrador.';
        loading = false;
        return;
      }

      checkPayload = { ...res, identifier: raw };
      saveStaffCheck(checkPayload);
      step = 'otp';

      if (res.otp_wait && res.otp_wait > 0) {
        startCooldown(res.otp_wait);
      }
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  function handleOtpInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const digits = target.value.replace(/\D/g, '').slice(0, 6);
    otpCode = digits;
    errorMsg = null;

    if (digits.length === 6 && !loading) {
      submitOtp(digits);
    }
  }

  async function submitOtp(code?: string) {
    const finalCode = code || otpCode.replace(/\D/g, '');
    if (finalCode.length !== 6) {
      errorMsg = 'Digite o código de 6 dígitos recebido no WhatsApp.';
      return;
    }

    if (!checkPayload?.external_id) {
      step = 'identifier';
      errorMsg = 'Sessão expirada. Informe seus dados novamente.';
      return;
    }

    loading = true;
    errorMsg = null;

    try {
      const loginRes = await loginStaff({
        external_id: checkPayload.external_id,
        otp: finalCode,
      });

      saveStaffLogin(loginRes);
      clearStaffCheck();
      window.location.href = '/';
    } catch (err) {
      errorMsg = getErrorMessage(err);
      otpCode = '';
    } finally {
      loading = false;
    }
  }

  async function submitMasterPassword() {
    if (!masterIdentifier.trim() || !masterPassword.trim()) {
      errorMsg = 'Preencha o identificador e a senha master.';
      return;
    }

    loading = true;
    errorMsg = null;

    try {
      const loginRes = await loginStaffPassword({
        identifier: masterIdentifier.trim(),
        password: masterPassword.trim(),
      });

      saveStaffLogin(loginRes);
      clearStaffCheck();
      window.location.href = '/';
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  function resetToIdentifier() {
    clearStaffCheck();
    checkPayload = null;
    otpCode = '';
    step = 'identifier';
    errorMsg = null;
  }
</script>

<div class="w-full max-w-md mx-auto">
  <!-- Card Container Zero-G Glass -->
  <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-ink/80 p-6 sm:p-8 backdrop-blur-2xl shadow-[var(--shadow-zero-g)]">
    <!-- Top Brand Accent Glow -->
    <div class="absolute -top-24 left-1/2 -translate-x-1/2 h-36 w-72 rounded-full bg-brand-yellow/15 blur-3xl pointer-events-none"></div>

    <!-- Header & Badge -->
    <div class="text-center mb-6">
      <div class="inline-flex items-center gap-2 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-1 text-xs font-bold text-brand-yellow mb-3">
        <span class="h-2 w-2 rounded-full bg-brand-yellow animate-ping"></span>
        <span>Acesso Restrito Staff</span>
      </div>
      <h1 class="font-display text-2xl tracking-tight text-white sm:text-3xl">
        Entrar no Painel
      </h1>
      <p class="mt-1 text-xs text-white/60">
        Ambiente exclusivo para operadores e administradores
      </p>
    </div>

    <!-- Mode Selector Tabs -->
    <div class="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 mb-6 border border-white/5">
      <button
        type="button"
        on:click={() => { mode = 'otp'; errorMsg = null; }}
        class="rounded-lg py-2 text-xs font-semibold transition-all {mode === 'otp' ? 'bg-brand-yellow text-brand-ink shadow font-bold' : 'text-white/60 hover:text-white'}"
      >
        WhatsApp (OTP)
      </button>
      <button
        type="button"
        on:click={() => { mode = 'password'; errorMsg = null; }}
        class="rounded-lg py-2 text-xs font-semibold transition-all {mode === 'password' ? 'bg-white/15 text-white shadow font-bold' : 'text-white/60 hover:text-white'}"
      >
        Senha Master
      </button>
    </div>

    <!-- Feedback Message -->
    {#if errorMsg}
      <div class="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
        <div class="flex items-center gap-2 font-semibold">
          <svg class="h-4 w-4 shrink-0 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      </div>
    {/if}

    <!-- TAB 1: WhatsApp (OTP) Flow -->
    {#if mode === 'otp'}
      {#if step === 'identifier'}
        <form on:submit|preventDefault={() => submitCheck()} class="space-y-4">
          <div>
            <label for="identifier" class="block text-xs font-semibold text-white/80 mb-1.5">
              Telefone WhatsApp ou CPF
            </label>
            <input
              id="identifier"
              type="text"
              inputmode="numeric"
              placeholder="(11) 99999-9999 ou CPF"
              bind:value={identifier}
              on:input={handleIdentifierInput}
              disabled={loading}
              autocomplete="tel"
              class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition"
            />
            <p class="mt-1.5 text-[11px] text-white/50">
              Ao completar 11 dígitos, o código de segurança será disparado no WhatsApp.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || identifier.replace(/\D/g, '').length < 10}
            class="w-full rounded-xl bg-brand-yellow py-3.5 text-center text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-lg cursor-pointer"
          >
            {#if loading}
              <span>Verificando privilégios...</span>
            {:else}
              <span>Receber Código de Acesso</span>
            {/if}
          </button>
        </form>
      {:else}
        <!-- Step 2: OTP Validation -->
        <form on:submit|preventDefault={() => submitOtp()} class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="otp" class="text-xs font-semibold text-white/80">
                Código de 6 dígitos (WhatsApp)
              </label>
              <button
                type="button"
                on:click={resetToIdentifier}
                class="text-[11px] text-brand-yellow hover:underline"
              >
                Trocar número
              </button>
            </div>
            <input
              id="otp"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="••••••"
              bind:value={otpCode}
              on:input={handleOtpInput}
              disabled={loading}
              autocomplete="one-time-code"
              class="w-full text-center tracking-[0.5em] font-mono rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-2xl font-bold text-brand-yellow placeholder-white/20 focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition"
            />
            <p class="mt-1.5 text-[11px] text-white/50 text-center">
              O login será autenticado automaticamente ao preencher os 6 dígitos.
            </p>
          </div>

          {#if cooldownSeconds > 0}
            <div class="text-center text-xs text-white/50">
              Reenviar código em <strong class="text-white">{cooldownSeconds}s</strong>
            </div>
          {:else}
            <div class="text-center">
              <button
                type="button"
                on:click={() => submitCheck()}
                disabled={loading}
                class="text-xs font-semibold text-brand-yellow hover:underline"
              >
                Não recebeu? Reenviar código agora
              </button>
            </div>
          {/if}

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            class="w-full rounded-xl bg-brand-yellow py-3.5 text-center text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-lg cursor-pointer"
          >
            {#if loading}
              <span>Autenticando...</span>
            {:else}
              <span>Confirmar e Entrar</span>
            {/if}
          </button>
        </form>
      {/if}
    {:else}
      <!-- TAB 2: Contingency Master Password -->
      <form on:submit|preventDefault={submitMasterPassword} class="space-y-4">
        <div>
          <label for="master-id" class="block text-xs font-semibold text-white/80 mb-1.5">
            Identificador (CPF, Telefone ou E-mail)
          </label>
          <input
            id="master-id"
            type="text"
            placeholder="admin@supletivo.net.br ou CPF"
            bind:value={masterIdentifier}
            disabled={loading}
            class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition"
          />
        </div>

        <div>
          <label for="master-pwd" class="block text-xs font-semibold text-white/80 mb-1.5">
            Senha Master
          </label>
          <input
            id="master-pwd"
            type="password"
            placeholder="••••••••••••"
            bind:value={masterPassword}
            disabled={loading}
            class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !masterIdentifier.trim() || !masterPassword.trim()}
          class="w-full rounded-xl bg-white/20 py-3.5 text-center text-sm font-bold text-white transition hover:bg-white/30 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-lg cursor-pointer"
        >
          {#if loading}
            <span>Validando credenciais...</span>
          {:else}
            <span>Entrar com Senha Master</span>
          {/if}
        </button>
      </form>
    {/if}
  </div>
</div>
