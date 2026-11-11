const ENDPOINT = 'https://api.web3forms.com/submit';
const CAPTCHA_SITE_KEY = '50b2fe65-b00b-4b9e-ad62-3ba471098be2';
const FIELDS = [
  'Источник', 'Телефон', 'Способ связи', 'Согласие на обработку данных',
  'Обращение', 'Площадь дома', 'Состав проекта', 'Этап',
  'utm_source', 'utm_medium', 'utm_campaign',
];
const widgets = new WeakMap();
let captchaReady;

export function hostedPayload(data) {
  const accessKey = data.get('access_key');
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(accessKey || '')) throw new Error('unconfigured');
  if (data.get('_honey') || data.get('botcheck')) throw new Error('spam');
  const captcha = data.get('h-captcha-response');
  if (!captcha) throw new Error('captcha');
  const payload = {
    access_key: accessKey,
    subject: 'Проект дома — заявка с лендинга',
    from_name: 'Проект дома',
    'Сайт': 'https://xn--80ahculiddjx.com/',
    'h-captcha-response': captcha,
  };
  for (const field of FIELDS) {
    const value = data.get(field);
    if (typeof value === 'string' && value) payload[field] = value;
  }
  payload.message = FIELDS.filter(field => payload[field]).map(field => `${field}: ${payload[field]}`).join('\n');
  return payload;
}

export function prepareCaptcha(form, status) {
  if (widgets.has(form)) return;
  if (!captchaReady) captchaReady = new Promise((resolve, reject) => {
    if (window.hcaptcha) {
      resolve(window.hcaptcha);
      return;
    }
    window.projectDomaCaptchaReady = () => resolve(window.hcaptcha);
    const script = document.createElement('script');
    script.src = 'https://js.hcaptcha.com/1/api.js?onload=projectDomaCaptchaReady&render=explicit&hl=ru&recaptchacompat=off';
    script.async = true;
    script.onerror = () => {
      script.remove();
      captchaReady = undefined;
      reject(new Error('captcha-unavailable'));
    };
    document.head.append(script);
  });
  void captchaReady.then(api => {
    if (widgets.has(form)) return;
    widgets.set(form, api.render(form.querySelector('[data-delivery-captcha]'), {
      sitekey: CAPTCHA_SITE_KEY, theme: 'dark', size: 'compact',
    }));
  }).catch(() => {
    status.textContent = 'Не загрузилась проверка от спама. Откройте форму ещё раз или позвоните в бюро.';
  });
}

export async function sendHosted(form, status) {
  const button = form.querySelector('[type="submit"]');
  let timer;
  let attempted = false;
  try {
    const payload = hostedPayload(new FormData(form));
    button.disabled = true;
    status.textContent = 'Отправляем заявку…';
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 20000);
    attempted = true;
    const response = await fetch(ENDPOINT, {
      method: 'POST', credentials: 'omit', signal: controller.signal,
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify(payload),
    });
    if (response.status === 429) throw new Error('rate-limit');
    if (!response.ok || (await response.json()).success !== true) throw new Error('provider');
    window.location.assign('thanks.html');
  } catch (error) {
    if (error.message === 'captcha') {
      status.textContent = 'Пройдите проверку «Я человек» и отправьте заявку ещё раз.';
    } else if (error.message === 'rate-limit') {
      status.textContent = 'Сервис временно ограничил отправку. Попробуйте позже или позвоните в бюро.';
    } else if (error.message === 'unconfigured') {
      status.textContent = 'Отправка пока недоступна. Позвоните в бюро по номеру +7 (499) 674-06-71.';
    } else {
      status.textContent = 'Нет подтверждения отправки. Данные остались в форме. Попробуйте ещё раз или позвоните в бюро.';
    }
    if (attempted && widgets.has(form)) window.hcaptcha.reset(widgets.get(form));
  } finally {
    clearTimeout(timer);
    button.disabled = false;
    form.removeAttribute('aria-busy');
  }
}
