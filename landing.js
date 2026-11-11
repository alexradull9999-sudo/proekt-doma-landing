const $ = selector => document.querySelector(selector);
const form = $('#contact-form');
const phone = form.elements['Телефон'];
const status = $('#form-status');
let submitting = false;
let currentProject;
let imageIndex = 0;
const focusOrigins = new WeakMap();
function openDialog(id, focusSelector) {
  const dialog = $('#' + id);
  focusOrigins.set(dialog, document.activeElement);
  dialog.showModal(); document.body.style.overflow = 'hidden';
  dialog.querySelector(focusSelector || 'button, input, a')?.focus({preventScroll: true});
}
function closeDialog(dialog) { dialog.close(); }
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) document.body.style.overflow = '';
    const origin = focusOrigins.get(dialog);
    if (!document.querySelector('dialog[open]') && origin?.isConnected && !origin.closest('dialog:not([open])')) origin.focus({preventScroll: true});
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(dialog);
  });
}
function openContact(title, context = '', parameters = {}) {
  $('#contact-title').textContent = title;
  $('#contact-context').textContent = context || 'Оставьте телефон и выберите удобный способ связи.';
  form.elements['Обращение'].value = (context || title).slice(0, 400);
  for (const name of ['Площадь дома', 'Состав проекта', 'Этап']) form.elements[name].value = parameters[name] || '';
  status.textContent = '';
  const galleryOrigin = $('#gallery').open ? focusOrigins.get($('#gallery')) : null;
  if ($('#gallery').open) closeDialog($('#gallery'));
  openDialog('contact', '#contact-title');
  if (galleryOrigin) focusOrigins.set($('#contact'), galleryOrigin);
}
function renderImage() {
  $('#gallery-image').src = currentProject.images[imageIndex];
  $('#gallery-image').alt = currentProject.alts[imageIndex];
  $('#gallery-count').textContent = `${imageIndex + 1} / ${currentProject.images.length}`;
  [...$('#gallery-thumbs').children].forEach((b, i) => b.setAttribute('aria-current', String(i === imageIndex)));
}
function openProject(id) {
  currentProject = window.LANDING_PROJECTS.find(p => p.id === id);
  if (!currentProject) return;
  imageIndex = 0;
  $('#gallery-title').textContent = currentProject.title;
  $('#gallery-description').textContent = currentProject.description;
  $('#gallery-status').textContent = currentProject.status;
  $('#gallery-thumbs').replaceChildren(...currentProject.images.map((src, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Ракурс ${i + 1}`);
    const image = document.createElement('img'); image.src = src; image.alt = currentProject.alts[i]; image.loading = 'lazy';
    b.append(image); b.addEventListener('click', () => {imageIndex = i; renderImage();}); return b;
  }));
  renderImage(); openDialog('gallery', '#gallery-title');
}
document.addEventListener('click', event => {
  const close = event.target.closest('[data-close]');
  if (close) {closeDialog(close.closest('dialog')); return;}
  if (event.target.closest('[data-menu-close]') && $('#menu').open) closeDialog($('#menu'));
  const project = event.target.closest('[data-project]');
  if (project) {event.preventDefault(); openProject(project.dataset.project); return;}
  const action = event.target.closest('[data-action]');
  if (action?.dataset.action === 'form') {
    event.preventDefault(); openContact(action.textContent.trim().replace(/↗︎?$/, '').trim(), action.dataset.context);
  } else if (action?.dataset.action === 'menu') openDialog('menu');
  const drawing = event.target.closest('a[data-gallery]');
  if (drawing && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    const title = drawing.getAttribute('aria-label');
    $('#lightbox-title').textContent = title;
    $('#lightbox img').src = drawing.href;
    $('#lightbox img').alt = title;
    $('#lightbox-original').href = drawing.href;
    openDialog('lightbox', '#lightbox-title');
  }
});
for (const [id, direction] of [['gallery-prev', -1], ['gallery-next', 1]]) $('#' + id).addEventListener('click', () => {
  imageIndex = (imageIndex + direction + currentProject.images.length) % currentProject.images.length; renderImage();
});
$('#gallery').addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); $('#' + (event.key === 'ArrowLeft' ? 'gallery-prev' : 'gallery-next')).click();}
});
$('#gallery-discuss').addEventListener('click', () => openContact('Обсудить похожий дом', `Интересует проект «${currentProject.title}».`));
$('#calc-form').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.target);
  const p = {'Площадь дома': `${data.get('area')} м²`, 'Состав проекта': data.get('package'), 'Этап': data.get('stage')};
  openContact('Получить расчёт проекта', `Площадь: ${p['Площадь дома']}. ${p['Состав проекта']}. ${p['Этап']}. Уточним задачу и подготовим предложение.`, p);
});
for (const checkbox of document.querySelectorAll('[data-checklist]')) checkbox.addEventListener('change', () => {
  $('.checklist-progress').textContent = `Отмечено: ${document.querySelectorAll('[data-checklist]:checked').length} из 18`;
});
const validPhone = value => {
  const digits = value.replace(/\D/g, '');
  return /^\+?[\d\s().-]+$/.test(value.trim()) && digits.length >= 10 && digits.length <= 15 && !/^(\d)\1+$/.test(digits);
};
phone.addEventListener('input', () => phone.setCustomValidity(''));
form.addEventListener('submit', event => {
  if (submitting || form.elements._honey.value) {event.preventDefault(); return;}
  phone.setCustomValidity(validPhone(phone.value) ? '' : 'Укажите телефон полностью: от 10 до 15 цифр.');
  if (!form.reportValidity()) {event.preventDefault(); return;}
  submitting = true; form.setAttribute('aria-busy', 'true'); status.textContent = 'Переходим к проверке от спама для отправки заявки.';
  // Native POST preserves FormSubmit's CAPTCHA and actual delivery response.
});
window.addEventListener('pageshow', () => {submitting = false; form.removeAttribute('aria-busy'); status.textContent = '';});
const params = new URLSearchParams(location.search);
for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) form.elements[key].value = (params.get(key) || '').slice(0, 150);

const filters = $('.portfolio-filters');
const filterButtons = [...filters.querySelectorAll('[data-project-filter]')];
const projectCards = [...document.querySelectorAll('#architecture-projects [data-style]')];
const portfolioMore = $('.portfolio-more');
const moreButton = portfolioMore.querySelector('button');
const featuredCount = 6;
let activeStyle = 'all';
let showAllProjects = false;

function renderPortfolio() {
  const matches = projectCards.filter(card => activeStyle === 'all' || card.dataset.style === activeStyle);
  const visible = activeStyle === 'all' && !showAllProjects ? matches.slice(0, featuredCount) : matches;
  for (const card of projectCards) card.hidden = !visible.includes(card);
  for (const button of filterButtons) button.setAttribute('aria-pressed', String(button.dataset.projectFilter === activeStyle));
  moreButton.hidden = activeStyle !== 'all' || projectCards.length <= featuredCount;
  moreButton.setAttribute('aria-expanded', String(showAllProjects));
  moreButton.textContent = showAllProjects ? 'Свернуть портфолио' : 'Показать все проекты';
  $('#portfolio-count').textContent = `Показано ${visible.length} из ${projectCards.length}`;
}

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    activeStyle = button.dataset.projectFilter;
    showAllProjects = false;
    renderPortfolio();
  });
}
moreButton.addEventListener('click', () => {
  showAllProjects = !showAllProjects;
  renderPortfolio();
});
renderPortfolio();
filters.hidden = false;
portfolioMore.hidden = false;

const marquee = $('[data-client-marquee]');
const marqueeToggle = $('[data-client-marquee-toggle]');
marquee.dataset.animated = 'true';
marqueeToggle.hidden = false;
marqueeToggle.addEventListener('click', () => {
  const paused = marquee.dataset.paused !== 'true';
  marquee.dataset.paused = String(paused);
  marqueeToggle.textContent = paused ? 'Продолжить' : 'Пауза';
  marqueeToggle.setAttribute('aria-label', paused ? 'Продолжить прокрутку брендов' : 'Приостановить прокрутку брендов');
});
