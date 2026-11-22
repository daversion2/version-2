/* Shared animation helpers. Each scene builds a GSAP timeline into `window.tl`,
   sets `window.DURATION` (seconds) and the renderer drives it with `window.seek(t)`. */
window.EASE = "expo.out"; // close to cubic-bezier(.16,1,.3,1)
window.EASE_IO = "power2.inOut";

window.seek = function (t) {
  if (!window.tl) return;
  window.tl.pause();
  window.tl.seek(Math.min(t, window.tl.duration()), false);
};

/* Make a path draw itself: sets dasharray to its length and returns a tween target. */
window.prepDraw = function (el, reverse) {
  const len = el.getTotalLength ? el.getTotalLength() : 1000;
  el.style.strokeDasharray = len;
  el.style.strokeDashoffset = reverse ? -len : len;
  return { el, len };
};
window.draw = function (tl, el, dur, at, ease) {
  const { len } = window.prepDraw(el);
  tl.to(el, { strokeDashoffset: 0, duration: dur, ease: ease || "power2.inOut" }, at);
};

/* Query-string params for templated scenes (title cards). */
window.params = Object.fromEntries(new URLSearchParams(location.search));

/* Build a mono text node inside an SVG. */
window.svgText = function (parent, x, y, str, cls, anchor) {
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", x); t.setAttribute("y", y);
  if (anchor) t.setAttribute("text-anchor", anchor);
  t.setAttribute("class", cls || "t-mono");
  t.textContent = str;
  parent.appendChild(t);
  return t;
};
window.svgEl = function (parent, tag, attrs) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
};
