// showreel editor sources sha256: c6295ae3c7977abe7ce08f4c187b427b4d47b7db28b7a8d00b6557b9c1ab4794
(() => {
  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n2, l3) {
    for (var u3 in l3) n2[u3] = l3[u3];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l3, u3, t3) {
    var i3, r3, o3, e3 = {};
    for (o3 in u3) "key" == o3 ? i3 = u3[o3] : "ref" == o3 ? r3 = u3[o3] : e3[o3] = u3[o3];
    if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t3), "function" == typeof l3 && null != l3.defaultProps) for (o3 in l3.defaultProps) void 0 === e3[o3] && (e3[o3] = l3.defaultProps[o3]);
    return x(l3, e3, i3, r3, null);
  }
  function x(n2, t3, i3, r3, o3) {
    var e3 = { type: n2, props: t3, key: i3, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
    return null == o3 && null != l.vnode && l.vnode(e3), e3;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function $(n2, l3) {
    if (null == l3) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u3; l3 < n2.__k.length; l3++) if (null != (u3 = n2.__k[l3]) && null != u3.__e) return u3.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u3 = n2.__v, t3 = u3.__e, i3 = [], r3 = [], o3 = m({}, u3);
      o3.__v = u3.__v + 1, l.vnode && l.vnode(o3), q(n2.__P, o3, u3, n2.__n, n2.__P.namespaceURI, 32 & u3.__u ? [t3] : null, i3, null == t3 ? $(u3) : t3, !!(32 & u3.__u), r3), o3.__v = u3.__v, o3.__.__k[o3.__i] = o3, D(i3, o3, r3), u3.__e = u3.__ = null, o3.__e != t3 && P(o3);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
      if (null != l3 && null != l3.__e) return n2.__e = n2.__c.base = l3.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l3 = 1; i.length; ) i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l3, u3, t3, i3, r3, o3, e3, f3, c3, a3) {
    var s3, h3, p3, v3, y3, _2, g2 = t3 && t3.__k || w, m3 = l3.length;
    for (f3 = T(u3, l3, g2, f3, m3), s3 = 0; s3 < m3; s3++) null != (p3 = u3.__k[s3]) && (h3 = -1 != p3.__i && g2[p3.__i] || d, p3.__i = s3, _2 = q(n2, p3, h3, i3, r3, o3, e3, f3, c3, a3), v3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && J(h3.ref, null, p3), a3.push(p3.ref, p3.__c || v3, p3)), null == y3 && null != v3 && (y3 = v3), 4 & p3.__u ? (f3 = j(p3, f3, n2), h3.__e && (h3.__e = null)) : "function" == typeof p3.type && void 0 !== _2 ? f3 = _2 : v3 && (f3 = v3.nextSibling), p3.__u &= -7);
    return u3.__e = y3, f3;
  }
  function T(n2, l3, u3, t3, i3) {
    var r3, o3, e3, f3, c3, a3 = u3.length, s3 = a3, h3 = 0;
    for (n2.__k = new Array(i3), r3 = 0; r3 < i3; r3++) null != (o3 = l3[r3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r3] = x(null, o3, null, null, null) : g(o3) ? o3 = n2.__k[r3] = x(S, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r3] = x(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f3 = r3 + h3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, -1 != (c3 = o3.__i = O(o3, u3, f3, s3)) && (s3--, (e3 = u3[c3]) && (e3.__u |= 2)), null == e3 || null == e3.__v ? (-1 == c3 && (i3 > a3 ? h3-- : i3 < a3 && h3++), "function" != typeof o3.type && (o3.__u |= 4)) : c3 != f3 && (c3 == f3 - 1 ? h3-- : c3 == f3 + 1 ? h3++ : (c3 > f3 ? h3-- : h3++, o3.__u |= 4))) : n2.__k[r3] = null;
    if (s3) for (r3 = 0; r3 < a3; r3++) null != (e3 = u3[r3]) && 0 == (2 & e3.__u) && (e3.__e == t3 && (t3 = $(e3)), K(e3, e3));
    return t3;
  }
  function j(n2, l3, u3) {
    var t3, i3;
    if ("function" == typeof n2.type) {
      for (t3 = n2.__k, i3 = 0; t3 && i3 < t3.length; i3++) t3[i3] && (t3[i3].__ = n2, l3 = j(t3[i3], l3, u3));
      return l3;
    }
    n2.__e != l3 && (l3 && n2.type && !l3.parentNode && (l3 = $(n2)), l3 = u3.insertBefore(n2.__e, l3 || null));
    do {
      l3 = l3 && l3.nextSibling;
    } while (null != l3 && 8 == l3.nodeType);
    return l3;
  }
  function O(n2, l3, u3, t3) {
    var i3, r3, o3, e3 = n2.key, f3 = n2.type, c3 = l3[u3], a3 = null != c3 && 0 == (2 & c3.__u);
    if (null === c3 && null == e3 || a3 && e3 == c3.key && f3 == c3.type) return u3;
    if (t3 > (a3 ? 1 : 0)) {
      for (i3 = u3 - 1, r3 = u3 + 1; i3 >= 0 || r3 < l3.length; ) if (null != (c3 = l3[o3 = i3 >= 0 ? i3-- : r3++]) && 0 == (2 & c3.__u) && e3 == c3.key && f3 == c3.type) return o3;
    }
    return -1;
  }
  function z(n2, l3, u3) {
    "-" == l3[0] ? n2.setProperty(l3, null == u3 ? "" : u3) : n2[l3] = null == u3 ? "" : "number" != typeof u3 || _.test(l3) ? u3 : u3 + "px";
  }
  function N(n2, l3, u3, t3, i3) {
    var r3, o3;
    n: if ("style" == l3) if ("string" == typeof u3) n2.style.cssText = u3;
    else {
      if ("string" == typeof t3 && (n2.style.cssText = t3 = ""), t3) for (l3 in t3) u3 && l3 in u3 || z(n2.style, l3, "");
      if (u3) for (l3 in u3) t3 && u3[l3] == t3[l3] || z(n2.style, l3, u3[l3]);
    }
    else if ("o" == l3[0] && "n" == l3[1]) r3 = l3 != (l3 = l3.replace(s, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u3, u3 ? t3 ? u3[a] = t3[a] : (u3[a] = h, n2.addEventListener(l3, r3 ? v : p, r3)) : n2.removeEventListener(l3, r3 ? v : p, r3);
    else {
      if ("http://www.w3.org/2000/svg" == i3) l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2) try {
        n2[l3] = null == u3 ? "" : u3;
        break n;
      } catch (n3) {
      }
      "function" == typeof u3 || (null == u3 || false === u3 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u3 ? "" : u3));
    }
  }
  function V(n2) {
    return function(u3) {
      if (this.l) {
        var t3 = this.l[u3.type + n2];
        if (null == u3[c]) u3[c] = h++;
        else if (u3[c] < t3[a]) return;
        return t3(l.event ? l.event(u3) : u3);
      }
    };
  }
  function q(n2, u3, t3, i3, r3, o3, e3, f3, c3, a3) {
    var s3, h3, p3, v3, y3, d3, _2, k3, x2, M, I2, P2, A3, H2, T3, j3, F = u3.type;
    if (void 0 !== u3.constructor) return null;
    128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f3 = u3.__e = t3.__e]), (s3 = l.__b) && s3(u3);
    n: if ("function" == typeof F) {
      h3 = e3.length;
      try {
        if (x2 = u3.props, M = F.prototype && F.prototype.render, I2 = (s3 = F.contextType) && i3[s3.__c], P2 = s3 ? I2 ? I2.props.value : s3.__ : i3, t3.__c ? k3 = (p3 = u3.__c = t3.__c).__ = p3.__E : (M ? u3.__c = p3 = new F(x2, P2) : (u3.__c = p3 = new C(x2, P2), p3.constructor = F, p3.render = Q), I2 && I2.sub(p3), p3.state || (p3.state = {}), p3.__n = i3, v3 = p3.__d = true, p3.__h = [], p3._sb = []), M && null == p3.__s && (p3.__s = p3.state), M && null != F.getDerivedStateFromProps && (p3.__s == p3.state && (p3.__s = m({}, p3.__s)), m(p3.__s, F.getDerivedStateFromProps(x2, p3.__s))), y3 = p3.props, d3 = p3.state, p3.__v = u3, v3) M && null == F.getDerivedStateFromProps && null != p3.componentWillMount && p3.componentWillMount(), M && null != p3.componentDidMount && p3.__h.push(p3.componentDidMount);
        else {
          if (M && null == F.getDerivedStateFromProps && x2 !== y3 && null != p3.componentWillReceiveProps && p3.componentWillReceiveProps(x2, P2), u3.__v == t3.__v || !p3.__e && null != p3.shouldComponentUpdate && false === p3.shouldComponentUpdate(x2, p3.__s, P2)) {
            u3.__v != t3.__v && (p3.props = x2, p3.state = p3.__s, p3.__d = false), u3.__e = t3.__e, u3.__k = t3.__k, u3.__k.some(function(n3) {
              n3 && (n3.__ = u3);
            }), w.push.apply(p3.__h, p3._sb), p3._sb = [], p3.__h.length && e3.push(p3), f3 = $(t3);
            break n;
          }
          null != p3.componentWillUpdate && p3.componentWillUpdate(x2, p3.__s, P2), M && null != p3.componentDidUpdate && p3.__h.push(function() {
            p3.componentDidUpdate(y3, d3, _2);
          });
        }
        if (p3.context = P2, p3.props = x2, p3.__P = n2, p3.__e = false, A3 = l.__r, H2 = 0, M) p3.state = p3.__s, p3.__d = false, A3 && A3(u3), s3 = p3.render(p3.props, p3.state, p3.context), w.push.apply(p3.__h, p3._sb), p3._sb = [];
        else do {
          p3.__d = false, A3 && A3(u3), s3 = p3.render(p3.props, p3.state, p3.context), p3.state = p3.__s;
        } while (p3.__d && ++H2 < 25);
        p3.state = p3.__s, null != p3.getChildContext && (i3 = m(m({}, i3), p3.getChildContext())), M && !v3 && null != p3.getSnapshotBeforeUpdate && (_2 = p3.getSnapshotBeforeUpdate(y3, d3)), T3 = null != s3 && s3.type === S && null == s3.key ? E(s3.props.children) : s3, f3 = L(n2, g(T3) ? T3 : [T3], u3, t3, i3, r3, o3, e3, f3, c3, a3), p3.base = u3.__e, u3.__u &= -161, p3.__h.length && e3.push(p3), k3 && (p3.__E = p3.__ = null);
      } catch (n3) {
        if (e3.length = h3, u3.__v = null, c3 || null != o3) {
          if (n3.then) {
            for (u3.__u |= c3 ? 160 : 128; f3 && 8 == f3.nodeType && f3.nextSibling; ) f3 = f3.nextSibling;
            null != o3 && (o3[o3.indexOf(f3)] = null), u3.__e = f3;
          } else if (null != o3) for (j3 = o3.length; j3--; ) b(o3[j3]);
        } else u3.__e = t3.__e;
        null == u3.__k && (u3.__k = t3.__k || []), n3.then || B(u3), l.__e(n3, u3, t3);
      }
    } else null == o3 && u3.__v == t3.__v ? (u3.__k = t3.__k, u3.__e = t3.__e) : f3 = u3.__e = G(t3.__e, u3, t3, i3, r3, o3, e3, c3, a3);
    return (s3 = l.diffed) && s3(u3), 128 & u3.__u ? void 0 : f3;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u3, t3) {
    for (var i3 = 0; i3 < t3.length; i3++) J(t3[i3], t3[++i3], t3[++i3]);
    l.__c && l.__c(u3, n2), n2.some(function(u4) {
      try {
        n2 = u4.__h, u4.__h = [], n2.some(function(n3) {
          n3.call(u4);
        });
      } catch (n3) {
        l.__e(n3, u4.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
  }
  function G(u3, t3, i3, r3, o3, e3, f3, c3, a3) {
    var s3, h3, p3, v3, y3, w3, _2, m3 = i3.props || d, k3 = t3.props, x2 = t3.type;
    if ("svg" == x2 ? o3 = "http://www.w3.org/2000/svg" : "math" == x2 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
      for (s3 = 0; s3 < e3.length; s3++) if ((y3 = e3[s3]) && "setAttribute" in y3 == !!x2 && (x2 ? y3.localName == x2 : 3 == y3.nodeType)) {
        u3 = y3, e3[s3] = null;
        break;
      }
    }
    if (null == u3) {
      if (null == x2) return document.createTextNode(k3);
      u3 = document.createElementNS(o3, x2, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = false), e3 = null;
    }
    if (null == x2) m3 === k3 || c3 && u3.data == k3 || (u3.data = k3);
    else {
      if (e3 = "textarea" == x2 && null != k3.defaultValue ? null : e3 && n.call(u3.childNodes), !c3 && null != e3) for (m3 = {}, s3 = 0; s3 < u3.attributes.length; s3++) m3[(y3 = u3.attributes[s3]).name] = y3.value;
      for (s3 in m3) y3 = m3[s3], "dangerouslySetInnerHTML" == s3 ? p3 = y3 : "children" == s3 || s3 in k3 || "value" == s3 && "defaultValue" in k3 || "checked" == s3 && "defaultChecked" in k3 || N(u3, s3, null, y3, o3);
      for (s3 in k3) y3 = k3[s3], "children" == s3 ? v3 = y3 : "dangerouslySetInnerHTML" == s3 ? h3 = y3 : "value" == s3 ? w3 = y3 : "checked" == s3 ? _2 = y3 : c3 && "function" != typeof y3 || m3[s3] === y3 || N(u3, s3, y3, m3[s3], o3);
      if (h3) c3 || p3 && (h3.__html == p3.__html || h3.__html == u3.innerHTML) || (u3.innerHTML = h3.__html), t3.__k = [];
      else if (p3 && (u3.innerHTML = ""), L("template" == t3.type ? u3.content : u3, g(v3) ? v3 : [v3], t3, i3, r3, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o3, e3, f3, e3 ? e3[0] : i3.__k && $(i3, 0), c3, a3), null != e3) for (s3 = e3.length; s3--; ) b(e3[s3]);
      c3 && "textarea" != x2 || (s3 = "value", "progress" == x2 && null == w3 ? u3.removeAttribute("value") : null != w3 && (w3 !== u3[s3] || "progress" == x2 && !w3 || "option" == x2 && w3 != m3[s3]) && N(u3, s3, w3, m3[s3], o3), s3 = "checked", null != _2 && _2 != u3[s3] && N(u3, s3, _2, m3[s3], o3));
    }
    return u3;
  }
  function J(n2, u3, t3) {
    try {
      if ("function" == typeof n2) {
        var i3 = "function" == typeof n2.__u;
        i3 && n2.__u(), i3 && null == u3 || (n2.__u = n2(u3));
      } else n2.current = u3;
    } catch (n3) {
      l.__e(n3, t3);
    }
  }
  function K(n2, u3, t3) {
    var i3, r3;
    if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || J(i3, null, u3)), null != (i3 = n2.__c)) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u3);
      }
      i3.base = i3.__P = i3.__n = null;
    }
    if (i3 = n2.__k) for (r3 = 0; r3 < i3.length; r3++) i3[r3] && K(i3[r3], u3, t3 || "function" != typeof n2.type);
    t3 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l3, u3) {
    return this.constructor(n2, u3);
  }
  function R(u3, t3, i3) {
    var r3, o3, e3, f3;
    t3 == document && (t3 = document.documentElement), l.__ && l.__(u3, t3), o3 = (r3 = "function" == typeof i3) ? null : i3 && i3.__k || t3.__k, e3 = [], f3 = [], q(t3, u3 = (!r3 && i3 || t3).__k = k(S, null, [u3]), o3 || d, d, t3.namespaceURI, !r3 && i3 ? [i3] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e3, !r3 && i3 ? i3 : o3 ? o3.__e : t3.firstChild, r3, f3), D(e3, u3, f3), u3.props.children = null;
  }
  n = w.slice, l = { __e: function(n2, l3, u3, t3) {
    for (var i3, r3, o3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
      if ((r3 = i3.constructor) && null != r3.getDerivedStateFromError && (i3.setState(r3.getDerivedStateFromError(n2)), o3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t3 || {}), o3 = i3.__d), o3) return i3.__E = i3;
    } catch (l4) {
      n2 = l4;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, C.prototype.setState = function(n2, l3) {
    var u3;
    u3 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u3), this.props)), n2 && m(u3, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // node_modules/preact/hooks/dist/hooks.module.js
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = 0;
  var f2 = [];
  var c2 = l;
  var e2 = c2.__b;
  var a2 = c2.__r;
  var v2 = c2.diffed;
  var l2 = c2.__c;
  var m2 = c2.unmount;
  var p2 = c2.__;
  function s2(n2, t3) {
    c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
    var u3 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u3.__.length && u3.__.push({}), u3.__[n2];
  }
  function d2(n2) {
    return o2 = 1, y2(D2, n2);
  }
  function y2(n2, u3, i3) {
    var o3 = s2(t2++, 2);
    if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u3) : D2(void 0, u3), function(n3) {
      var t3 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t3, n3);
      t3 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
    }], o3.__c = r2, !r2.__f)) {
      var f3 = function(n3, t3, r3) {
        if (!o3.__c.__H) return true;
        var u4 = false, i4 = o3.__c.props !== n3;
        if (o3.__c.__H.__.some(function(n4) {
          if (n4.__N) {
            u4 = true;
            var t4 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i4 = true);
          }
        }), c3) {
          var f4 = c3.call(this, n3, t3, r3);
          return u4 ? f4 || i4 : f4;
        }
        return !u4 || i4;
      };
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n3, t3, r3) {
        if (this.__e) {
          var u4 = c3;
          c3 = void 0, f3(n3, t3, r3), c3 = u4;
        }
        e3 && e3.call(this, n3, t3, r3);
      }, r2.shouldComponentUpdate = f3;
    }
    return o3.__N || o3.__;
  }
  function h2(n2, u3) {
    var i3 = s2(t2++, 3);
    !c2.__s && C2(i3.__H, u3) && (i3.__ = n2, i3.u = u3, r2.__H.__h.push(i3));
  }
  function A2(n2) {
    return o2 = 5, T2(function() {
      return { current: n2 };
    }, []);
  }
  function T2(n2, r3) {
    var u3 = s2(t2++, 7);
    return C2(u3.__H, r3) && (u3.__ = n2(), u3.__H = r3, u3.__h = n2), u3.__;
  }
  function j2() {
    for (var n2; n2 = f2.shift(); ) {
      var t3 = n2.__H;
      if (n2.__P && t3) try {
        t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
      } catch (r3) {
        t3.__h = [], c2.__e(r3, n2.__v);
      }
    }
  }
  c2.__b = function(n2) {
    r2 = null, e2 && e2(n2);
  }, c2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
  }, c2.__r = function(n2) {
    a2 && a2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n2) {
    v2 && v2(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && (1 !== f2.push(t3) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u, n3.u = void 0);
    })), u2 = r2 = null;
  }, c2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B2(n4);
        });
      } catch (r3) {
        t3.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t3 = [], c2.__e(r3, n3.__v);
      }
    }), l2 && l2(n2, t3);
  }, c2.unmount = function(n2) {
    m2 && m2(n2);
    var t3, r3 = n2.__c;
    r3 && r3.__H && (r3.__H.__.some(function(n3) {
      try {
        z2(n3);
      } catch (n4) {
        t3 = n4;
      }
    }), r3.__H = void 0, t3 && c2.__e(t3, r3.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function w2(n2) {
    var t3, r3 = function() {
      clearTimeout(u3), k2 && cancelAnimationFrame(t3), setTimeout(n2);
    }, u3 = setTimeout(r3, 35);
    k2 && (t3 = requestAnimationFrame(r3));
  }
  function z2(n2) {
    var t3 = r2, u3 = n2.__c;
    "function" == typeof u3 && (n2.__c = void 0, u3()), r2 = t3;
  }
  function B2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function C2(n2, t3) {
    return !n2 || n2.length !== t3.length || t3.some(function(t4, r3) {
      return t4 !== n2[r3];
    });
  }
  function D2(n2, t3) {
    return "function" == typeof t3 ? t3(n2) : t3;
  }

  // scripts/lib/compose/zoom.mjs
  var clamp = (v3, max) => Math.max(0, Math.min(max, v3));
  function maxSharpZoom({ sourceWidthPx, frameWidthPx }) {
    if (!(sourceWidthPx > 0) || !(frameWidthPx > 0) || !Number.isFinite(sourceWidthPx + frameWidthPx)) throw new Error("Widths must be finite and positive");
    return Math.max(1, sourceWidthPx / frameWidthPx);
  }
  function suggestZoomRegions({ events, record, options = {} }) {
    const {
      depth = 1.7,
      kinds = ["click", "fill"],
      leadIn = 0.1,
      holdAfterClick = 0.9,
      holdAfterTyping = 0.6,
      minGap = 0.8,
      maxBoxFraction = 0.6
    } = options;
    const { width, height } = events.viewport;
    const regions = [];
    for (const target of events.targets) {
      const { box, stepId } = target;
      if (!kinds.includes(target.kind) || box.w * box.h > width * height * maxBoxFraction) continue;
      const click = events.clicks.find((c3) => c3.stepId === stepId && c3.t >= target.t);
      const keys = target.kind === "fill" ? events.keys.filter((k3) => k3.stepId === stepId && k3.t >= target.t) : [];
      const end = keys.length ? keys.at(-1).t + holdAfterTyping : (click?.t ?? target.t) + holdAfterClick;
      const tStart = clamp(target.t + leadIn, record.durationSec), tEnd = clamp(end, record.durationSec);
      if (tEnd - tStart < 0.4) continue;
      const keyframe = { t: tStart, x: clamp(box.x + box.w / 2, width), y: clamp(box.y + box.h / 2, height) };
      const previous = regions.at(-1);
      if (previous && tStart - previous.tEnd < minGap) {
        previous.tEnd = Math.max(previous.tEnd, tEnd);
        previous.keyframes.push(keyframe);
        if (!previous.stepIds.includes(stepId)) previous.stepIds.push(stepId);
      } else regions.push({ id: `z${regions.length + 1}`, tStart, tEnd, depth, keyframes: [keyframe], stepIds: [stepId], source: "auto" });
    }
    return regions;
  }
  function validateRegions(regions, { duration = Infinity, maxSharp = Infinity } = {}) {
    const errors = [], warnings = [], ids = /* @__PURE__ */ new Set();
    if (!Array.isArray(regions)) return { ok: false, errors: ["regions must be an array"], warnings };
    regions.forEach((r3, i3) => {
      const prefix = `regions[${i3}]`;
      if (!r3 || typeof r3 !== "object") {
        errors.push(`${prefix} must be an object`);
        return;
      }
      for (const k3 of Object.keys(r3)) if (!["id", "tStart", "tEnd", "depth", "keyframes", "stepIds", "source"].includes(k3)) errors.push(`${prefix}.${k3} is unknown`);
      if (typeof r3.id !== "string" || !r3.id.trim() || ids.has(r3.id)) errors.push(`${prefix}.id must be nonempty and unique`);
      ids.add(r3.id);
      if (!Number.isFinite(r3.tStart) || !Number.isFinite(r3.tEnd) || r3.tStart < 0 || r3.tStart >= r3.tEnd || r3.tEnd > duration) errors.push(`${prefix} has invalid times`);
      if (i3 && r3.tStart < regions[i3 - 1]?.tEnd) errors.push(`${prefix} must be sorted and non-overlapping`);
      if (!Number.isFinite(r3.depth) || r3.depth < 1.05 || r3.depth > 4) errors.push(`${prefix}.depth must be from 1.05 to 4`);
      if (r3.depth > maxSharp) warnings.push(`region ${r3.id} depth ${r3.depth} exceeds the sharp limit ${maxSharp}`);
      if (!["auto", "manual"].includes(r3.source)) errors.push(`${prefix}.source must be auto|manual`);
      if (!Array.isArray(r3.stepIds) || r3.stepIds.some((id) => typeof id !== "string")) errors.push(`${prefix}.stepIds must be strings`);
      if (!Array.isArray(r3.keyframes) || !r3.keyframes.length) errors.push(`${prefix}.keyframes must not be empty`);
      else r3.keyframes.forEach((k3, j3) => {
        if (!k3 || !Number.isFinite(k3.t) || k3.t < r3.tStart || k3.t > r3.tEnd || j3 && k3.t < r3.keyframes[j3 - 1]?.t || !Number.isFinite(k3.x) || !Number.isFinite(k3.y)) errors.push(`${prefix}.keyframes[${j3}] is invalid`);
        if (k3 && Object.keys(k3).some((key) => !["t", "x", "y"].includes(key))) errors.push(`${prefix}.keyframes[${j3}] has an unknown key`);
      });
      if (r3.keyframes?.[0]?.t !== r3.tStart) errors.push(`${prefix}.keyframes[0].t must equal tStart`);
    });
    return { ok: !errors.length, errors, warnings };
  }

  // scripts/lib/compose/timemap.mjs
  var clamp2 = (x2, lo, hi) => Math.max(lo, Math.min(hi, x2));
  function validateRanges(ranges, name, duration, speeds = false) {
    if (!Array.isArray(ranges)) throw new Error(`${name} must be an array`);
    ranges.forEach((r3, i3) => {
      if (!r3 || !Number.isFinite(r3.start) || !Number.isFinite(r3.end) || r3.start < 0 || r3.end > duration || r3.start >= r3.end || i3 > 0 && r3.start < ranges[i3 - 1].end) throw new Error(`${name}[${i3}] is invalid or overlaps the preceding range`);
      if (speeds && (!Number.isFinite(r3.rate) || r3.rate < 0.25 || r3.rate > 8)) throw new Error(`${name}[${i3}].rate must be from 0.25 to 8`);
    });
  }
  function sourceAt(map, tOut) {
    const { segments, mainStart, mainEnd, titleEnd, outroStart, outputDuration } = map;
    const t3 = clamp2(tOut, 0, outputDuration);
    const s3 = segments.find((s4) => t3 < s4.outputEnd) ?? segments.at(-1);
    const first = segments[0];
    const sourceT = !s3 ? 0 : t3 <= mainStart ? first.start : t3 >= mainEnd ? s3.end : s3.start + (t3 - s3.outputStart) * s3.rate;
    const alphaTitle = titleEnd === 0 || t3 >= titleEnd ? 0 : t3 <= mainStart ? 1 : (titleEnd - t3) / (titleEnd - mainStart);
    const alphaOutro = outroStart === null || t3 < outroStart ? 0 : t3 >= mainEnd ? 1 : (t3 - outroStart) / (mainEnd - outroStart);
    return {
      t: sourceT,
      rate: s3?.rate ?? 1,
      section: t3 < mainStart ? "title" : t3 <= mainEnd ? "main" : outroStart !== null && t3 >= outroStart ? "outro" : "title",
      alphaTitle: clamp2(alphaTitle, 0, 1),
      alphaOutro: clamp2(alphaOutro, 0, 1)
    };
  }
  function outputAt(map, tSrc) {
    if (!Number.isFinite(tSrc) || tSrc < 0 || tSrc > map.duration) return null;
    if (map.trims.some(({ start, end }) => tSrc >= start && tSrc < end)) return null;
    const s3 = map.segments.find((s4) => tSrc >= s4.start && tSrc < s4.end) ?? (tSrc === map.duration && map.segments.at(-1)?.end === tSrc ? map.segments.at(-1) : null);
    return s3 ? s3.outputStart + (tSrc - s3.start) / s3.rate : null;
  }
  function buildTimeMap({ duration, trims = [], speeds = [], lead = 0, tail = 0, fade = 0 }) {
    for (const [key, value] of Object.entries({ duration, lead, tail, fade })) {
      if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be finite and nonnegative`);
    }
    validateRanges(trims, "trims", duration);
    validateRanges(speeds, "speeds", duration, true);
    speeds.forEach((s3, i3) => {
      if (trims.some((r3) => s3.start < r3.end && s3.end > r3.start)) throw new Error(`speeds[${i3}] intersects a trim`);
    });
    const mainStart = Math.max(0, lead - fade);
    const points = [.../* @__PURE__ */ new Set([0, duration, ...trims.flatMap((r3) => [r3.start, r3.end]), ...speeds.flatMap((r3) => [r3.start, r3.end])])].sort((a3, b2) => a3 - b2);
    const segments = [];
    let output = mainStart;
    for (let i3 = 0; i3 < points.length - 1; i3++) {
      const start = points[i3], end = points[i3 + 1];
      if (trims.some((r3) => start >= r3.start && start < r3.end)) continue;
      const rate = speeds.find((r3) => start >= r3.start && start < r3.end)?.rate ?? 1;
      const outputEnd = output + (end - start) / rate;
      segments.push({ start, end, rate, outputStart: output, outputEnd });
      output = outputEnd;
    }
    const outroStart = tail > 0 ? output - Math.min(fade, tail, output - mainStart) : null;
    const map = {
      duration,
      trims: trims.map((r3) => ({ ...r3 })),
      segments,
      mainStart,
      mainEnd: output,
      titleEnd: lead,
      outroStart,
      outputDuration: Math.max(lead, tail > 0 ? outroStart + tail : output)
    };
    return { ...map, toSource: (t3) => sourceAt(map, t3), toOutput: (t3) => outputAt(map, t3) };
  }

  // scripts/lib/compose/themes.mjs
  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  var THEMES = freeze({
    clean: {
      name: "clean",
      background: { type: "gradient", angle: 135, colors: ["#eef2f7", "#dbe4f0"] },
      frame: { radiusPx: 14, shadow: { blurPx: 40, offsetYPx: 16, color: "rgba(17,24,39,0.22)" } },
      cursor: { fill: "#ffffff", stroke: "#111827" },
      ripple: { color: "#0f766e" },
      caption: { background: "rgba(17,24,39,0.86)", color: "#ffffff", fontWeight: 600 },
      card: { background: { type: "gradient", colors: ["#eef2f7", "#dbe4f0"] }, titleColor: "#111827", subtitleColor: "#4b5563", accent: "#0f766e" },
      font: "Inter"
    },
    dark: {
      name: "dark",
      background: { type: "gradient", angle: 135, colors: ["#0b1220", "#172033"] },
      frame: { radiusPx: 14, shadow: { blurPx: 40, offsetYPx: 16, color: "rgba(0,0,0,0.45)" } },
      cursor: { fill: "#ffffff", stroke: "#111827" },
      ripple: { color: "#2dd4bf" },
      caption: { background: "rgba(255,255,255,0.14)", color: "#ffffff", fontWeight: 600 },
      card: { background: { type: "gradient", colors: ["#0b1220", "#172033"] }, titleColor: "#f9fafb", subtitleColor: "#cbd5e1", accent: "#2dd4bf" },
      font: "Inter"
    }
  });

  // scripts/lib/compose/composition.mjs
  var object = (v3) => v3 !== null && typeof v3 === "object" && !Array.isArray(v3);
  function freeze2(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze2);
      Object.freeze(value);
    }
    return value;
  }
  var cursorImageModel = { image: null, hotspot: { x: 0, y: 0 } };
  var customCursorModel = { arrow: cursorImageModel, hand: cursorImageModel, text: cursorImageModel, heightPct: null };
  var background = { type: "theme", colors: ["#eef2f7", "#dbe4f0"], angle: 135, image: null };
  var cardDefaults = {
    align: "center",
    titleSizePct: 7,
    subtitleSizePct: 3.6,
    titleColor: "#111827",
    subtitleColor: "#4b5563",
    background,
    accent: { enabled: true, color: "#0f766e", shape: "bar", widthPct: 12 },
    logo: null
  };
  var DEFAULT_COMPOSITION = freeze2({
    version: 1,
    run: { id: null },
    output: { width: 1920, height: 1080, fps: 60, quality: "standard" },
    theme: "clean",
    frame: {
      paddingXPct: 8,
      paddingYPct: 5,
      radiusPx: 14,
      shadow: { enabled: true, blurPx: 40, offsetYPx: 16, opacity: 0.25 },
      border: { enabled: false, color: "#ffffff", widthPx: 1 },
      background
    },
    cursor: {
      visible: true,
      style: "arrow",
      custom: null,
      sizePct: 3.4,
      fill: "#ffffff",
      stroke: "#111827",
      shadow: true,
      scaleWithZoom: true,
      hideWhenIdleSec: 1.8,
      pressScale: 0.86,
      autoShape: true,
      followThrough: { enabled: true, distancePx: 140, durationSec: 0.8, startAfterClickSec: 0.35 },
      microCorrection: true,
      entrance: true,
      clickEffect: { style: "none", color: null, sizeMult: 1, durationSec: 0.55 }
    },
    zoom: {
      enabled: true,
      depth: "medium",
      autoSuggest: true,
      speed: "normal",
      holdAfterClickSec: 0.9,
      leadInSec: 0.1,
      onlyKinds: ["click", "fill"],
      regions: []
    },
    captions: {
      enabled: true,
      mode: "band",
      position: "bottom",
      bandHeightPct: 13,
      fontSizePct: 3.4,
      fontWeight: 600,
      color: "#ffffff",
      background: "rgba(17,24,39,0.86)",
      maxLines: 2,
      align: "center"
    },
    cards: {
      title: { ...cardDefaults, enabled: true, title: null, subtitle: null, durationSec: 2.2 },
      outro: { ...cardDefaults, enabled: true, text: "Thank you", subtitle: null, durationSec: 2 },
      fade: 0.4,
      transition: "crossfade"
    },
    edits: { trims: [], speeds: [] }
  });
  var COMPOSITION_RANGES = [
    ["output.width", 2, 7680, true],
    ["output.height", 2, 4320, true],
    ["frame.paddingXPct", 0, 25],
    ["frame.paddingYPct", 0, 25],
    ["frame.radiusPx", 0, 300],
    ["frame.shadow.blurPx", 0, 300],
    ["frame.shadow.offsetYPx", -300, 300],
    ["frame.shadow.opacity", 0, 1],
    ["frame.border.widthPx", 0, 30],
    ["cursor.followThrough.distancePx", 0, 500],
    ["cursor.followThrough.durationSec", 0.1, 5],
    ["cursor.followThrough.startAfterClickSec", 0, 5],
    ["cursor.sizePct", 1, 8],
    ["cursor.hideWhenIdleSec", 0, 60],
    ["cursor.pressScale", 0.1, 1],
    ["cursor.clickEffect.sizeMult", 0.1, 10],
    ["cursor.clickEffect.durationSec", 0.05, 5],
    ["zoom.holdAfterClickSec", 0, 30],
    ["zoom.leadInSec", 0, 5],
    ["captions.bandHeightPct", 6, 25],
    ["captions.fontSizePct", 1, 10],
    ["cards.fade", 0, 1.5]
  ];
  var COMPOSITION_ENUMS = {
    "cursor.style": ["arrow", "pointer", "dot", "ring", "crosshair", "custom"],
    "cursor.clickEffect.style": ["ripple", "pulse", "none"],
    "zoom.speed": ["slow", "normal", "fast"],
    "captions.mode": ["band", "overlay"],
    "captions.position": ["top", "bottom"],
    "captions.fontWeight": [400, 600, 700],
    "captions.maxLines": [1, 2, 3],
    "captions.align": ["center", "left"],
    "cards.transition": ["crossfade", "cut"]
  };
  var SETTING_RANGES = Object.fromEntries([
    ...COMPOSITION_RANGES,
    ["frame.paddingPct", 0, 25],
    ["zoom.depth", 1.05, 4],
    ["cursor.custom.heightPct", 1, 8],
    ...["arrow", "hand", "text"].flatMap((s3) => ["x", "y"].map((k3) => [`cursor.custom.${s3}.hotspot.${k3}`, 0, 1])),
    ...["title", "outro"].flatMap((k3) => [["durationSec", 0, 30], ["titleSizePct", 1, 20], ["subtitleSizePct", 1, 12], ["accent.widthPct", 0, 100], ["logo.heightPct", 1, 40]].map(([p3, a3, b2]) => [`cards.${k3}.${p3}`, a3, b2])),
    ...["frame.background", "cards.title.background", "cards.outro.background"].map((p3) => [`${p3}.angle`, 0, 360])
  ].map(([p3, min, max, integer = false]) => [p3, { min, max, step: integer ? 1 : 0.01 }]));
  var SETTING_ENUMS = {
    ...COMPOSITION_ENUMS,
    theme: Object.keys(THEMES),
    "output.fps": [30, 60],
    "output.quality": ["standard", "high"],
    ...Object.fromEntries(["title", "outro"].flatMap((k3) => [[`cards.${k3}.align`, ["center", "left"]], [`cards.${k3}.accent.shape`, ["bar", "underline", "none"]]])),
    ...Object.fromEntries(["frame.background", "cards.title.background", "cards.outro.background"].map((p3) => [`${p3}.type`, ["theme", "gradient", "solid", "image"]]))
  };
  var zoomDepth = (depth) => ({ subtle: 1.35, medium: 1.7, strong: 2.1 })[depth] ?? depth;
  function merge(base, patch) {
    if (!object(base) || !object(patch)) return copy(patch);
    const result = copy(base);
    for (const [key, value] of Object.entries(patch)) Object.defineProperty(result, key, { value: object(value) && object(base[key]) ? merge(base[key], value) : copy(value), enumerable: true, writable: true, configurable: true });
    return result;
  }
  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (object(value)) return Object.fromEntries(Object.entries(value).map(([k3, v3]) => [k3, copy(v3)]));
    return value;
  }
  var safeImagePath = (v3) => typeof v3 === "string" && !!v3.trim() && !/^(?:[\\/]|[a-z][a-z0-9+.-]*:)/i.test(v3) && !v3.split(/[\\/]/).some((part) => part === ".." || part === "") && !/[?#%\x00-\x1f]/.test(v3);
  function resolveComposition(input) {
    const theme = typeof input.theme === "string" && Object.hasOwn(THEMES, input.theme) ? THEMES[input.theme] : THEMES.clean;
    const themed = merge(DEFAULT_COMPOSITION, {
      frame: { background: { colors: theme.background.colors, angle: theme.background.angle }, radiusPx: theme.frame.radiusPx, shadow: { blurPx: theme.frame.shadow.blurPx, offsetYPx: theme.frame.shadow.offsetYPx } },
      cursor: theme.cursor,
      captions: theme.caption,
      cards: Object.fromEntries(["title", "outro"].map((key) => [key, {
        titleColor: theme.card.titleColor,
        subtitleColor: theme.card.subtitleColor,
        background: { colors: theme.card.background.colors, angle: theme.card.background.angle ?? 135 },
        accent: { color: theme.card.accent }
      }]))
    });
    const patch = copy(input);
    if (patch.frame?.paddingPct !== void 0) {
      patch.frame.paddingXPct ??= patch.frame.paddingPct;
      patch.frame.paddingYPct ??= patch.frame.paddingPct;
      delete patch.frame.paddingPct;
    }
    for (const key of ["title", "outro"]) if (patch.cards?.[key]?.duration !== void 0) {
      patch.cards[key].durationSec ??= patch.cards[key].duration;
      delete patch.cards[key].duration;
    }
    for (const key of ["title", "outro"]) if (object(patch.cards?.[key]?.logo)) patch.cards[key].logo = merge({ image: null, heightPct: 10 }, patch.cards[key].logo);
    if (object(patch.cursor?.custom)) for (const shape of ["arrow", "hand", "text"]) {
      if (object(patch.cursor.custom[shape])) patch.cursor.custom[shape] = merge(cursorImageModel, patch.cursor.custom[shape]);
    }
    if (typeof patch.cursor?.clickEffect === "boolean") patch.cursor.clickEffect = { ...DEFAULT_COMPOSITION.cursor.clickEffect, style: patch.cursor.clickEffect ? "ripple" : "none" };
    return merge(themed, patch);
  }
  function validateComposition(c3, { duration = Number.MAX_VALUE } = {}) {
    const errors = [], warnings = [];
    const fail = (p3, m3) => errors.push(`composition.json: "${p3}" ${m3}`);
    const range2 = (p3, v3, min, max, integer = false) => {
      if (!Number.isFinite(v3) || v3 < min || v3 > max || integer && !Number.isInteger(v3)) fail(p3, `must be ${integer ? "an integer" : "a number"} from ${min} to ${max}`);
    };
    const namedColors = new Set("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent turquoise violet wheat white whitesmoke yellow yellowgreen".split(" "));
    const color = (p3, v3, nullable = false) => {
      if (nullable && v3 === null) return;
      if (typeof v3 !== "string" || !namedColors.has(v3.toLowerCase()) && !/^(#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|(?:rgb|hsl)a?\([\d.,% +/\-]+\))$/i.test(v3)) fail(p3, "must be a CSS color");
    };
    function walk(v3, model, p3 = "") {
      if (!object(v3)) {
        fail(p3 || "composition", "must be an object");
        return;
      }
      for (const [k3, x2] of Object.entries(v3)) {
        const key = p3 ? `${p3}.${k3}` : k3;
        if (p3 === "frame" && k3 === "paddingPct" || /^cards\.(title|outro)$/.test(p3) && k3 === "duration") {
          range2(key, x2, 0, k3 === "duration" ? 30 : 25);
          continue;
        }
        if (key === "captions.cues") continue;
        if (!Object.hasOwn(model, k3)) {
          fail(key, "is an unknown key");
          continue;
        }
        if (key === "cursor.clickEffect" && typeof x2 === "boolean") continue;
        if (key === "cursor.custom") {
          if (x2 !== null) walk(x2, customCursorModel, key);
        } else if (k3 === "logo") {
          if (x2 !== null) walk(x2, { image: null, heightPct: 10 }, key);
        } else if (object(model[k3])) walk(x2, model[k3], key);
        else if (Array.isArray(model[k3])) {
          if (!Array.isArray(x2)) fail(key, "must be an array");
        } else if (typeof model[k3] === "boolean" && typeof x2 !== "boolean") fail(key, "must be boolean");
        if (k3 === "heightPct" && p3.endsWith(".logo")) range2(key, x2, 1, 40);
        if (k3 === "image" && x2 !== null && !safeImagePath(x2)) fail(key, "must be a local path inside the project");
      }
    }
    walk(c3, DEFAULT_COMPOSITION);
    if (!object(c3)) return { ok: false, errors, warnings };
    for (const p3 of ["version", "run.id", "output.width", "output.height", "output.fps", "theme", "frame", "cursor.visible", "cursor.sizePct", "cursor.clickEffect", "zoom.enabled", "zoom.depth", "zoom.autoSuggest", "zoom.regions", "captions.enabled", "captions.mode", "cards.title.enabled", "cards.outro.enabled", "cards.fade", "edits.trims", "edits.speeds"]) {
      if (p3.split(".").reduce((v3, k3) => v3?.[k3], c3) === void 0) fail(p3, "is required");
    }
    const d3 = resolveComposition(c3);
    const get = (p3) => p3.split(".").reduce((v3, k3) => v3?.[k3], d3);
    const enumAt = (p3, values) => {
      if (!values.includes(get(p3))) fail(p3, `must be ${values.join("|")}`);
    };
    enumAt("version", [1]);
    enumAt("theme", Object.keys(THEMES));
    enumAt("output.fps", [30, 60]);
    enumAt("output.quality", ["standard", "high"]);
    if (typeof c3.run?.id !== "string" || !c3.run.id.trim()) fail("run.id", "must be nonempty");
    for (const [p3, min, max, int] of COMPOSITION_RANGES) range2(p3, get(p3), min, max, int);
    range2("zoom.depth", zoomDepth(d3.zoom?.depth), 1.05, 4);
    for (const [p3, values] of Object.entries(COMPOSITION_ENUMS)) enumAt(p3, values);
    const custom = d3.cursor?.custom;
    if (d3.cursor?.style === "custom" && !safeImagePath(custom?.arrow?.image)) fail("cursor.custom.arrow.image", "is required for custom style");
    if (object(custom)) {
      if (!safeImagePath(custom.arrow?.image)) fail("cursor.custom.arrow.image", "must be a local PNG, SVG or WebP path");
      if (custom.heightPct !== void 0) range2("cursor.custom.heightPct", custom.heightPct, 1, 8);
      for (const shape of ["arrow", "hand", "text"]) {
        const spec = custom[shape], p3 = `cursor.custom.${shape}`;
        if (spec === void 0) continue;
        if (!safeImagePath(spec?.image) || !/\.(png|svg|webp)$/i.test(spec.image)) fail(`${p3}.image`, "must be a local PNG, SVG or WebP path");
        range2(`${p3}.hotspot.x`, spec?.hotspot?.x, 0, 1);
        range2(`${p3}.hotspot.y`, spec?.hotspot?.y, 0, 1);
      }
    }
    if (!Array.isArray(d3.zoom?.onlyKinds) || d3.zoom.onlyKinds.some((k3) => !["click", "fill"].includes(k3))) fail("zoom.onlyKinds", "must contain click|fill");
    for (const p3 of ["frame.border.color", "cursor.fill", "cursor.stroke", "captions.color", "captions.background"]) color(p3, get(p3));
    color("cursor.clickEffect.color", get("cursor.clickEffect.color"), true);
    for (const key of ["title", "outro"]) {
      const p3 = `cards.${key}`;
      enumAt(`${p3}.align`, ["center", "left"]);
      enumAt(`${p3}.accent.shape`, ["bar", "underline", "none"]);
      for (const [k3, min, max] of [["durationSec", 0, 30], ["titleSizePct", 1, 20], ["subtitleSizePct", 1, 12], ["accent.widthPct", 0, 100]]) range2(`${p3}.${k3}`, get(`${p3}.${k3}`), min, max);
      for (const k3 of ["titleColor", "subtitleColor", "accent.color"]) color(`${p3}.${k3}`, get(`${p3}.${k3}`));
      for (const k3 of [key === "title" ? "title" : "text", "subtitle"]) {
        const v3 = get(`${p3}.${k3}`);
        if (v3 !== null && (typeof v3 !== "string" || !v3.trim())) fail(`${p3}.${k3}`, "must be nonempty text or null");
      }
      if (get(`${p3}.enabled`) && !get(`${p3}.${key === "title" ? "title" : "text"}`)) fail(p3, "requires text when enabled");
      const logo = get(`${p3}.logo`);
      if (object(logo)) range2(`${p3}.logo.heightPct`, logo.heightPct, 1, 40);
      if (object(logo) && !safeImagePath(logo.image)) fail(`${p3}.logo.image`, "must be a local path inside the project");
    }
    for (const p3 of ["frame.background", "cards.title.background", "cards.outro.background"]) {
      enumAt(`${p3}.type`, ["theme", "gradient", "solid", "image"]);
      range2(`${p3}.angle`, get(`${p3}.angle`), 0, 360);
      const colors = get(`${p3}.colors`);
      if (!Array.isArray(colors) || colors.length < 1 || colors.length > 16 || get(`${p3}.type`) === "gradient" && colors.length < 2) fail(`${p3}.colors`, "must contain 1 to 16 colors (at least 2 for a gradient)");
      else colors.forEach((v3, i3) => color(`${p3}.colors.${i3}`, v3));
      if (get(`${p3}.type`) === "image" && !safeImagePath(get(`${p3}.image`))) fail(`${p3}.image`, "must be a local path inside the project");
    }
    if (c3.captions?.cues !== void 0) {
      const cues = c3.captions.cues;
      if (!Array.isArray(cues) || cues.length > 200) fail("captions.cues", "must be an array of at most 200 cues");
      else cues.forEach((cue, i3) => {
        const p3 = `captions.cues.${i3}`;
        walk(cue, { id: "", text: "", start: 0, end: 0 }, p3);
        if (typeof cue?.id !== "string" || !cue.id.trim()) fail(`${p3}.id`, "must be nonempty text");
        if (typeof cue?.text !== "string" || !cue.text.trim() || cue.text.length > 140) fail(`${p3}.text`, "must contain 1 to 140 characters");
        if (!Number.isFinite(cue?.start) || !Number.isFinite(cue?.end) || cue.start < 0 || cue.start >= cue.end || cue.end > duration) fail(p3, "has out of range source times");
        if (i3 && cue?.start < cues[i3 - 1]?.end) fail(p3, "overlaps the previous cue or is unsorted");
      });
    }
    const regions = validateRegions(c3.zoom?.regions);
    errors.push(...regions.errors);
    warnings.push(...regions.warnings);
    for (const [k3, model] of [["trims", { start: 0, end: 0 }], ["speeds", { start: 0, end: 0, rate: 1 }]]) if (Array.isArray(c3.edits?.[k3])) c3.edits[k3].forEach((v3, i3) => {
      walk(v3, model, `edits.${k3}.${i3}`);
      try {
        buildTimeMap({ duration: Number.MAX_VALUE, [k3]: [v3] });
      } catch (e3) {
        fail(`edits.${k3}.${i3}`, e3.message);
      }
    });
    try {
      buildTimeMap({ duration: Number.MAX_VALUE, trims: c3.edits?.trims, speeds: c3.edits?.speeds });
    } catch (e3) {
      fail("edits", e3.message);
    }
    return { ok: !errors.length, errors, warnings };
  }
  function compositionPaths(c3) {
    const value = resolveComposition(c3), result = {};
    function visit(v3, p3 = "") {
      for (const [k3, x2] of Object.entries(v3)) {
        const key = p3 ? `${p3}.${k3}` : k3;
        if (object(x2)) visit(x2, key);
        else result[key] = x2;
      }
    }
    visit(value);
    result["captions.cues"] = value.captions.cues;
    result["frame.paddingPct"] = value.frame.paddingPct ?? null;
    for (const k3 of ["title", "outro"]) {
      result[`cards.${k3}.logo.image`] = value.cards[k3].logo?.image ?? null;
      result[`cards.${k3}.logo.heightPct`] = value.cards[k3].logo?.heightPct ?? 10;
    }
    result["cursor.custom"] = value.cursor.custom;
    for (const shape of ["arrow", "hand", "text"]) {
      const spec = value.cursor.custom?.[shape];
      result[`cursor.custom.${shape}.image`] = spec?.image ?? null;
      result[`cursor.custom.${shape}.hotspot.x`] = spec?.hotspot?.x ?? 0;
      result[`cursor.custom.${shape}.hotspot.y`] = spec?.hotspot?.y ?? 0;
      result[`cursor.custom.${shape}.hotspot`] = spec?.hotspot ?? { x: 0, y: 0 };
      result[`cursor.custom.${shape}`] = spec ?? null;
    }
    result["cursor.custom.heightPct"] = value.cursor.custom?.heightPct ?? value.cursor.sizePct;
    return result;
  }
  function changeComposition(c3, path, value, { reset = false } = {}) {
    const paths = compositionPaths(c3);
    if (!Object.hasOwn(paths, path) && !object(path.split(".").reduce((v3, k3) => v3?.[k3], DEFAULT_COMPOSITION))) throw new Error(`Unknown composition path: ${path}`);
    const keys = path.split(".");
    if (keys.some((k3) => ["__proto__", "constructor", "prototype"].includes(k3))) throw new Error("Invalid composition path");
    const next = copy(c3), last2 = keys.pop();
    if (path === "frame.paddingPct") {
      next.frame = {
        ...next.frame,
        paddingXPct: reset ? DEFAULT_COMPOSITION.frame.paddingXPct : value,
        paddingYPct: reset ? DEFAULT_COMPOSITION.frame.paddingYPct : value
      };
      delete next.frame.paddingPct;
      return next;
    }
    if (/^cards\.(title|outro)\.durationSec$/.test(path)) delete next.cards[keys[1]].duration;
    if (reset && /^cards\.(title|outro)\.logo.image$/.test(path)) {
      next.cards[keys[1]].logo = null;
      return next;
    }
    let node = next;
    for (const k3 of keys) {
      if (!object(node[k3])) node[k3] = k3 === "logo" ? { image: null, heightPct: 10 } : {};
      node = node[k3];
    }
    if (reset) {
      delete node[last2];
      const defaults = resolveComposition({ theme: c3.theme });
      const def = path.endsWith(".logo.heightPct") ? 10 : [...keys, last2].reduce((v3, k3) => v3?.[k3], defaults);
      if (def !== void 0) node[last2] = copy(def);
    } else node[last2] = copy(value);
    if (/^zoom\.(depth|holdAfterClickSec|leadInSec|onlyKinds)$/.test(path) && next.zoom.regions?.every((r3) => r3.source === "auto")) next.zoom.regions = [];
    return next;
  }
  function zoomOptions(zoom) {
    return { depth: zoomDepth(zoom.depth), kinds: zoom.onlyKinds, leadIn: zoom.leadInSec, holdAfterClick: zoom.holdAfterClickSec };
  }

  // scripts/lib/compose/camera.mjs
  var clamp3 = (x2, lo, hi) => Math.max(lo, Math.min(hi, x2));
  function planCamera({ regions, duration, source: { width, height }, hz = 60, omega = 7 }) {
    if (![width, height, hz, omega].every((v3) => Number.isFinite(v3) && v3 > 0) || !Number.isFinite(duration) || duration < 0) throw new Error("Invalid camera dimensions, duration or spring parameters");
    const maxDepth = Math.max(1, ...regions.map((r3) => r3.depth));
    let state = [width / 2, height / 2, 0], velocity = [0, 0, 0], time = 0;
    const samples = [];
    const sample = (t3) => {
      const z3 = clamp3(Math.exp(state[2]), 1, maxDepth);
      const cx = clamp3(state[0], width / (2 * z3), width - width / (2 * z3));
      const cy = clamp3(state[1], height / (2 * z3), height - height / (2 * z3));
      samples.push({ t: t3, cx, cy, z: z3 });
    };
    sample(0);
    const boundaries = [...new Set(regions.flatMap((r3) => [r3.tStart, r3.tEnd, ...r3.keyframes.map((k3) => k3.t)]))].filter((t3) => t3 > 0 && t3 < duration).sort((a3, b2) => a3 - b2);
    let boundaryIndex = 0;
    for (let n2 = 1; time < duration; n2++) {
      const next = Math.min(n2 / hz, duration);
      while (time < next) {
        while (boundaryIndex < boundaries.length && boundaries[boundaryIndex] <= time + 1e-12) boundaryIndex++;
        const end = Math.min(next, time + 1 / 240, boundaries[boundaryIndex] ?? Infinity);
        const dt = end - time;
        const region = regions.find((r3) => time + 1e-12 >= r3.tStart && time + 1e-12 < r3.tEnd);
        const focus = region?.keyframes.findLast((k3) => k3.t <= time + 1e-12);
        const target = region ? [focus?.x ?? width / 2, focus?.y ?? height / 2, Math.log(region.depth)] : [width / 2, height / 2, 0];
        state = state.map((x2, i3) => {
          velocity[i3] += (omega * omega * (target[i3] - x2) - 2 * omega * velocity[i3]) * dt;
          return x2 + velocity[i3] * dt;
        });
        time = end;
      }
      sample(next);
    }
    return { hz, samples };
  }
  function cameraAt(plan, t3) {
    const samples = plan.samples;
    if (!samples?.length) throw new Error("Camera plan must contain samples");
    let lo = 0, hi = samples.length - 1;
    if (t3 <= samples[lo].t) return pick(samples[lo]);
    if (t3 >= samples[hi].t) return pick(samples[hi]);
    while (hi - lo > 1) {
      const mid = lo + hi >> 1;
      if (samples[mid].t <= t3) lo = mid;
      else hi = mid;
    }
    const a3 = samples[lo], b2 = samples[hi], f3 = (t3 - a3.t) / (b2.t - a3.t);
    return {
      cx: a3.cx + (b2.cx - a3.cx) * f3,
      cy: a3.cy + (b2.cy - a3.cy) * f3,
      z: a3.z + (b2.z - a3.z) * f3
    };
  }
  var pick = ({ cx, cy, z: z3 }) => ({ cx, cy, z: z3 });

  // scripts/lib/compose/cursor-track.mjs
  var smooth = (t3) => t3 * t3 * (3 - 2 * t3);
  function latest(samples, t3) {
    let lo = 0, hi = samples.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (samples[mid].t <= t3) lo = mid + 1;
      else hi = mid;
    }
    return lo - 1;
  }
  function cursorAt(events, t3) {
    const samples = events.cursor;
    if (!samples.length) return { x: events.viewport.width / 2, y: events.viewport.height / 2 };
    const i3 = latest(samples, t3), a3 = samples[Math.max(0, i3)], b2 = samples[i3 + 1];
    if (i3 < 0 || !b2) return { x: a3.x, y: a3.y };
    const f3 = (t3 - a3.t) / (b2.t - a3.t);
    return { x: a3.x + (b2.x - a3.x) * f3, y: a3.y + (b2.y - a3.y) * f3 };
  }
  function pressAmount(events, t3) {
    let amount = 1;
    for (const click of events.clicks) {
      const age = t3 - click.t;
      if (age < 0 || age >= 0.12) continue;
      const scale = age <= 0.045 ? 1 - 0.14 * smooth(age / 0.045) : 0.86 + 0.14 * smooth((age - 0.045) / 0.075);
      amount = Math.min(amount, scale);
    }
    return amount;
  }
  function rippleAt(events, t3, durationSec = 0.55) {
    const c3 = events.clicks[latest(events.clicks, t3)];
    return c3 && t3 < c3.t + durationSec ? { x: c3.x, y: c3.y, progress: (t3 - c3.t) / durationSec } : null;
  }

  // scripts/lib/compose/cursor-director.mjs
  var clamp4 = (v3, a3, b2) => Math.max(a3, Math.min(b2, v3));
  var smooth2 = (v3) => {
    const t3 = clamp4(v3, 0, 1);
    return t3 * t3 * (3 - 2 * t3);
  };
  var mix = (a3, b2, f3) => ({ x: a3.x + (b2.x - a3.x) * f3, y: a3.y + (b2.y - a3.y) * f3 });
  var distance = (a3, b2) => Math.hypot(a3.x - b2.x, a3.y - b2.y);
  function directCursor({ events, options = {} }) {
    const o3 = { autoShape: true, microCorrection: true, entrance: true, hideWhenIdleSec: 1.8, ...options };
    const follow = { enabled: true, distancePx: 140, durationSec: 0.8, startAfterClickSec: 0.35, ...options.followThrough };
    const original = events.cursor ?? [], clicks = events.clicks ?? [], keys = events.keys ?? [];
    const at = (t3) => cursorAt({ ...events, cursor: original }, t3);
    const latest2 = (list, time, extra = 0) => list.reduce((end, item) => Math.max(end, item[time] + extra), 0);
    const duration = options.durationSec ?? Math.max(latest2(original, "t"), latest2(clicks, "t", 4), latest2(keys, "t", 2), latest2(events.steps ?? [], "tEnd"));
    const moves = [];
    for (let i3 = 1; i3 < original.length; i3++) {
      const a3 = original[i3 - 1], b2 = original[i3];
      if (distance(a3, b2) < 1e-7) continue;
      const previous = moves.at(-1);
      if (previous && previous.end === a3.t) previous.end = b2.t;
      else moves.push({ start: a3.t, end: b2.t });
    }
    const firstMove = moves[0]?.start ?? original[0]?.t ?? 0;
    const targets = (events.targets ?? []).map((target, i3, all) => {
      const end = all[i3 + 1]?.t ?? duration;
      const click = clicks.find((c3) => c3.stepId === target.stepId && c3.t >= target.t && c3.t < end);
      const typing = keys.filter((k3) => k3.stepId === target.stepId && k3.t >= target.t && k3.t < end);
      const shape = target.cursor !== void 0 ? target.cursor === "pointer" ? "hand" : target.cursor === "text" ? "text" : "arrow" : { click: "hand", fill: "text" }[target.kind] ?? "arrow";
      const point = click ?? { x: target.box.x + target.box.w / 2, y: target.box.y + target.box.h / 2 };
      return { ...target, shape, point, click, typing, end: shape === "text" && typing.length ? typing.at(-1).t + 0.8 : (click?.t ?? target.t) + 0.35 };
    });
    const protectedTimes = [
      ...clicks.map((c3) => ({ start: c3.t - 1, end: c3.t + 1 })),
      ...keys.map((k3) => ({ start: k3.t - 0.5, end: k3.t + 0.5 })),
      ...targets.filter((t3) => t3.kind === "fill" && t3.typing.length).map((t3) => ({ start: t3.click?.t ?? t3.t, end: t3.typing.at(-1).t + 0.5 }))
    ];
    const drifts = follow.enabled ? clicks.flatMap((c3, index) => {
      const next = Math.min(
        moves.find((m3) => m3.start > c3.t)?.start ?? duration + 0.15,
        clicks[index + 1] ? clicks[index + 1].t - 0.22 : Infinity
      );
      const start = c3.t + follow.startAfterClickSec;
      if (next - c3.t < follow.startAfterClickSec + 0.2) return [];
      const end = Math.min(start + follow.durationSec, next - 0.15);
      if (end <= start) return [];
      const motion = moves.filter((m3) => m3.end <= c3.t).at(-1);
      const a3 = motion ? at(Math.max(motion.start, motion.end - 0.1)) : c3;
      const b2 = motion ? at(motion.end) : { x: c3.x + 1, y: c3.y + 1 };
      const length = distance(a3, b2);
      const dx = length > 1e-7 ? (b2.x - a3.x) / length : Math.SQRT1_2;
      const dy = length > 1e-7 ? (b2.y - a3.y) / length : Math.SQRT1_2;
      const fraction = Math.min(1, (end - start) / follow.durationSec);
      const marginX = Math.min(24, events.viewport.width / 2), marginY = Math.min(24, events.viewport.height / 2);
      const to = {
        x: clamp4(c3.x + dx * follow.distancePx * fraction, marginX, events.viewport.width - marginX),
        y: clamp4(c3.y + dy * follow.distancePx * fraction, marginY, events.viewport.height - marginY)
      };
      return [{ start, end, next, from: c3, to }];
    }) : [];
    function position(t3) {
      let p3 = at(t3);
      const drift = drifts.findLast((d3) => t3 >= d3.start && t3 < d3.next);
      if (drift) {
        if (t3 <= drift.end) p3 = mix(drift.from, drift.to, 1 - (1 - (t3 - drift.start) / (drift.end - drift.start)) ** 3);
        else {
          const age = t3 - drift.end;
          const float = (hz, phase) => 0.75 * (Math.sin(age * 2 * Math.PI * hz + phase) - Math.sin(phase));
          p3 = { x: drift.to.x + float(0.35, 0.73), y: drift.to.y + float(0.55, 1.91) };
          p3.x = clamp4(p3.x, Math.min(24, events.viewport.width / 2), events.viewport.width - Math.min(24, events.viewport.width / 2));
          p3.y = clamp4(p3.y, Math.min(24, events.viewport.height / 2), events.viewport.height - Math.min(24, events.viewport.height / 2));
          if (t3 > drift.next - 0.15) p3 = mix(p3, at(drift.next), smooth2((t3 - drift.next + 0.15) / 0.15));
        }
      }
      if (o3.microCorrection) {
        const c3 = clicks.find((c4) => t3 >= c4.t - 0.22 && t3 <= c4.t);
        if (c3) {
          const a3 = at(c3.t - 0.22);
          const motion = moves.filter((m3) => m3.end <= c3.t).at(-1);
          const before = motion ? at(Math.max(motion.start, motion.end - 0.1)) : { x: c3.x - 1, y: c3.y - 1 };
          const n2 = distance(before, c3);
          const short = {
            x: c3.x - 5 * (n2 > 1e-7 ? (c3.x - before.x) / n2 : Math.SQRT1_2),
            y: c3.y - 5 * (n2 > 1e-7 ? (c3.y - before.y) / n2 : Math.SQRT1_2)
          };
          const f3 = (t3 - c3.t + 0.22) / 0.22;
          p3 = f3 < 0.5 ? mix(a3, short, smooth2(f3 * 2)) : mix(short, c3, smooth2(f3 * 2 - 1));
        }
      }
      return p3;
    }
    const activity = [
      ...moves.map((m3) => ({ start: m3.start, end: m3.end, wake: 0.15 })),
      ...drifts.map((d3) => ({ start: d3.start, end: d3.end, wake: 0.15 })),
      ...protectedTimes.map((p3) => ({ ...p3, wake: 0.25 }))
    ].sort((a3, b2) => a3.start - b2.start);
    const busy = [];
    for (const interval of activity) {
      const previous = busy.at(-1);
      if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
      else busy.push({ ...interval });
    }
    function opacity(t3) {
      const entrance = o3.entrance ? clamp4((t3 - firstMove + 0.4) / 0.3, 0, 1) : 1;
      if (!o3.hideWhenIdleSec) return entrance;
      let idle = 1, previousEnd = 0;
      for (const interval of [...busy, { start: Infinity, end: Infinity, wake: 0.15 }]) {
        if (t3 < interval.start + 0.25 - interval.wake) {
          const faded = 1 - clamp4((t3 - previousEnd - o3.hideWhenIdleSec) / 0.4, 0, 1);
          const wake = clamp4((t3 - interval.start + interval.wake) / 0.25, 0, 1);
          idle = Math.max(faded, wake);
          break;
        }
        if (t3 <= interval.end) break;
        previousEnd = interval.end;
      }
      return Math.min(entrance, idle);
    }
    const disabled = !o3.autoShape && !follow.enabled && !o3.microCorrection && !o3.entrance && !o3.hideWhenIdleSec;
    if (disabled) return { samples: original.map((s3) => ({ ...s3 })), shapes: [{ t: 0, shape: "arrow" }], alpha: [{ t: 0, a: 1 }] };
    const times = /* @__PURE__ */ new Set([0, duration, ...clicks.map((c3) => c3.t)]);
    for (let i3 = 0; i3 / 60 < duration; i3++) times.add(i3 / 60);
    const samples = [], shapes = [{ t: 0, shape: "arrow" }], alpha = [];
    for (const t3 of [...times].filter((t4) => t4 >= 0 && t4 <= duration).sort((a3, b2) => a3 - b2)) {
      const p3 = position(t3);
      samples.push({ t: t3, ...p3 });
      alpha.push({ t: t3, a: opacity(t3) });
      const target = o3.autoShape && targets.findLast((target2) => t3 >= target2.t && t3 <= target2.end && (t3 >= (target2.click?.t ?? Infinity) || distance(p3, target2.point) <= 24));
      const shape = target?.shape ?? "arrow";
      if (shape !== shapes.at(-1).shape) shapes.push({ t: t3, shape });
    }
    return { samples, shapes, alpha };
  }

  // scripts/lib/compose/captions.mjs
  var smooth3 = (t3) => t3 * t3 * (3 - 2 * t3);
  function cuesFromRun({ storyboard, events, captionsEnabled }) {
    if (!captionsEnabled) return [];
    const cues = storyboard.steps.flatMap((step) => {
      const timing = events.steps.find((entry) => entry.id === step.id);
      return step.caption?.trim() && timing ? [{ id: step.id, text: step.caption, start: timing.tStart + 0.15, end: timing.tEnd - 0.1 }] : [];
    }).sort((a3, b2) => a3.start - b2.start);
    return cues.map((cue, i3) => ({ ...cue, end: Math.min(Math.max(cue.end, cue.start + 1), cues[i3 + 1] ? cues[i3 + 1].start - 0.05 : Infinity) })).filter((cue) => cue.end > cue.start);
  }
  function captionAlpha(cue, t3) {
    if (t3 <= cue.start || t3 >= cue.end) return 0;
    return smooth3(Math.min(1, (t3 - cue.start) / 0.2, (cue.end - t3) / 0.2));
  }
  function wrap(text, width, measure) {
    const lines = [];
    let line = "";
    for (const word of text.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (measure(word) <= width) {
        line = word;
        continue;
      }
      for (const char of word) {
        if (line && measure(line + char) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function wrapLines(text, maxWidth, measure, { maxLines = 2 } = {}) {
    if (!Number.isFinite(maxWidth) || maxWidth <= 0 || !Number.isInteger(maxLines) || maxLines < 1) throw new Error("Invalid caption wrapping bounds");
    let lines;
    for (const scale of [1, 0.9, 0.8]) {
      lines = wrap(text, maxWidth / scale, measure);
      if (lines.length <= maxLines) return { lines, scale };
    }
    lines = lines.slice(0, maxLines);
    let last2 = lines.at(-1);
    const width = maxWidth / 0.8;
    while (measure(last2 + "\u2026") > width && last2.includes(" ")) last2 = last2.slice(0, last2.lastIndexOf(" "));
    while (last2 && measure(last2 + "\u2026") > width) last2 = Array.from(last2).slice(0, -1).join("");
    lines[lines.length - 1] = measure("\u2026") <= width ? last2 + "\u2026" : "";
    return { lines, scale: 0.8 };
  }

  // scripts/lib/compose/layout.mjs
  function layoutFor({ output, source, composition }) {
    const { width, height } = output;
    if (![width, height, source.width, source.height].every((v3) => Number.isFinite(v3) && v3 > 0)) throw new Error("Layout dimensions must be finite and positive");
    const px = composition.frame?.paddingXPct ?? composition.frame?.paddingPct ?? 8;
    const py = composition.frame?.paddingYPct ?? composition.frame?.paddingPct ?? 5;
    const captions = composition.captions;
    const band = captions?.enabled && captions.mode === "band" ? Math.round(height * (captions.bandHeightPct ?? 13) / 100) : 0;
    const availableH = height - band;
    const scale = Math.min(width * (1 - 2 * px / 100) / source.width, (availableH - 2 * height * py / 100) / source.height);
    const w3 = Math.round(source.width * scale), h3 = Math.round(source.height * scale);
    const frame = { x: Math.round((width - w3) / 2), y: Math.round((availableH - h3) / 2) + (band && captions.position === "top" ? band : 0), w: w3, h: h3 };
    let caption = null;
    if (captions?.enabled) {
      if (band) caption = { x: 0, y: captions.position === "top" ? 0 : height - band, w: width, h: band };
      else {
        const w4 = Math.round(frame.w * 0.8), h4 = Math.round(height * 0.075);
        caption = { x: Math.round(frame.x + (frame.w - w4) / 2), y: Math.round(captions.position === "top" ? frame.y + height * 0.04 : frame.y + frame.h - height * 0.04 - h4), w: w4, h: h4 };
      }
    }
    return { canvas: { width, height }, frame, caption, scaleFramePx: w3 / source.width };
  }

  // scripts/lib/compose/plan.mjs
  function planRender({ composition, brief, storyboard, events, record, sourceSize: sourceSize2, assetWarnings = [] }) {
    void brief;
    const validation = validateComposition(composition, { duration: record.durationSec });
    if (!validation.ok) throw new Error(validation.errors.join("\n"));
    if (![sourceSize2.width, sourceSize2.height, record.scale.used].every((v3) => Number.isFinite(v3) && v3 > 0)) throw new Error("Invalid source size or capture scale");
    composition = resolveComposition(composition);
    const { output, cards } = composition;
    const layout = layoutFor({ output, source: sourceSize2, composition });
    const timemap = buildTimeMap({
      duration: record.durationSec,
      ...composition.edits,
      lead: cards.title.enabled ? cards.title.durationSec : 0,
      tail: cards.outro.enabled ? cards.outro.durationSec : 0,
      fade: cards.transition === "cut" ? 0 : cards.fade
    });
    const savedRegions = validateRegions(composition.zoom.regions, { duration: record.durationSec });
    if (!savedRegions.ok) throw new Error(savedRegions.errors.join("\n"));
    const auto = composition.zoom.autoSuggest && composition.zoom.regions.every((r3) => r3.source === "auto");
    const regions = !composition.zoom.enabled ? [] : auto ? suggestZoomRegions({ events, record, options: zoomOptions(composition.zoom) }) : composition.zoom.regions;
    const regionValidation = validateRegions(regions, {
      duration: record.durationSec,
      maxSharp: maxSharpZoom({ sourceWidthPx: sourceSize2.width, frameWidthPx: layout.frame.w })
    });
    if (!regionValidation.ok) throw new Error(regionValidation.errors.join("\n"));
    const cssSource = { width: sourceSize2.width / record.scale.used, height: sourceSize2.height / record.scale.used };
    const clone3 = (v3) => JSON.parse(JSON.stringify(v3));
    return {
      output: clone3(output),
      layout,
      theme: THEMES[composition.theme],
      frame: clone3(composition.frame),
      timemap,
      regions: clone3(regions),
      camera: planCamera({ regions, duration: record.durationSec, source: cssSource, omega: { slow: 5, normal: 7, fast: 10 }[composition.zoom.speed] }),
      cues: !composition.captions.enabled ? [] : composition.captions.cues !== void 0 ? clone3(composition.captions.cues) : cuesFromRun({ storyboard, events, captionsEnabled: true }),
      captions: clone3(composition.captions),
      cursor: {
        ...directCursor({ events, options: { ...composition.cursor, durationSec: record.durationSec } }),
        sizePx: output.height * (composition.cursor.style === "custom" ? composition.cursor.custom?.heightPct ?? composition.cursor.sizePct : composition.cursor.sizePct) / 100,
        color: THEMES[composition.theme].cursor.fill,
        ...composition.cursor
      },
      clicks: clone3(events.clicks),
      ripples: clone3(events.clicks),
      sourceSize: { ...sourceSize2 },
      viewport: { ...events.viewport },
      scale: record.scale.used,
      warnings: [...assetWarnings, ...record.warnings ?? [], ...regionValidation.warnings, ...composition.captions.mode === "overlay" ? ["overlay captions can cover the video"] : []],
      cards: clone3(cards)
    };
  }
  function stateAt(plan, tOut) {
    const mapped = sourceAt(plan.timemap, tOut), t3 = mapped.t;
    const events = { cursor: plan.cursor.samples, clicks: plan.clicks, viewport: plan.viewport };
    const cue = plan.cues.find((c3) => t3 >= c3.start && t3 <= c3.end);
    const press = 1 - (1 - pressAmount(events, t3)) / 0.14 * (1 - plan.cursor.pressScale);
    const frames = plan.cursor.alpha ?? [{ t: 0, a: 1 }];
    let lo = 0, hi = frames.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (frames[mid].t <= t3) lo = mid + 1;
      else hi = mid;
    }
    const index = Math.max(0, lo - 1);
    const a3 = frames[index], b2 = frames[index + 1];
    const alpha = b2 ? a3.a + (b2.a - a3.a) * Math.max(0, (t3 - a3.t) / (b2.t - a3.t)) : a3.a;
    const shapeKey = plan.cursor.shapes?.findLast((k3) => k3.t <= t3);
    const age = t3 - (shapeKey?.t ?? -Infinity);
    const pop = shapeKey && shapeKey !== plan.cursor.shapes[0] && age < 0.12 ? 1 + 0.12 * Math.sin(Math.PI * age / 0.12) : 1;
    const effect = plan.cursor.clickEffect;
    const ripple = effect.style !== "none" ? rippleAt(events, t3, effect.durationSec) : null;
    return {
      section: mapped.section,
      alphaTitle: mapped.alphaTitle,
      alphaOutro: mapped.alphaOutro,
      sourceT: t3,
      rate: mapped.rate,
      camera: cameraAt(plan.camera, t3),
      cursor: { ...cursorAt(events, t3), press, alpha, shape: shapeKey?.shape ?? "arrow", pop },
      ripple,
      caption: cue ? { text: cue.text, alpha: captionAlpha(cue, t3) } : null
    };
  }

  // editor/state.js
  var initialState = () => ({
    project: null,
    composition: null,
    plan: null,
    dirty: false,
    saving: false,
    error: null,
    errors: [],
    past: [],
    future: [],
    lastChange: null
  });
  var clone = (value) => structuredClone(value);
  function reducer(state, action) {
    switch (action.type) {
      case "load":
        return { ...initialState(), project: action.project, composition: clone(action.project.composition) };
      case "change": {
        if (JSON.stringify(action.composition) === JSON.stringify(state.composition)) return state;
        const coalesce = action.path && !state.future.length && state.lastChange?.path === action.path && action.now >= state.lastChange.now && action.now - state.lastChange.now < 600;
        return {
          ...state,
          composition: clone(action.composition),
          dirty: true,
          error: null,
          errors: [],
          future: [],
          past: coalesce ? state.past : [...state.past, clone(state.composition)].slice(-100),
          lastChange: { path: action.path, now: action.now }
        };
      }
      case "undo":
      case "redo": {
        const undo = action.type === "undo", from = undo ? "past" : "future", to = undo ? "future" : "past";
        if (!state[from].length) return state;
        return {
          ...state,
          composition: clone(state[from].at(-1)),
          [from]: state[from].slice(0, -1),
          [to]: [...state[to], clone(state.composition)].slice(-100),
          lastChange: null,
          dirty: true,
          error: null,
          errors: []
        };
      }
      default:
        return state;
    }
  }
  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: { "content-type": "application/json", ...options.headers }
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error ?? data.errors?.join("\n") ?? `Request failed (${response.status})`), { errors: data.errors ?? [] });
    return data;
  }
  function createEditorStore({ api = request, debounce = 800 } = {}) {
    let state = initialState(), sourceSize2, timer, pending, disposed = false;
    const listeners = /* @__PURE__ */ new Set();
    const publish = (patch) => {
      if (!disposed) {
        state = { ...state, ...patch };
        listeners.forEach((fn) => fn(state));
      }
    };
    function rebuild() {
      if (!state.project || !sourceSize2) return;
      try {
        publish({ plan: planRender({ ...state.project, composition: state.composition, sourceSize: sourceSize2 }), error: null, errors: [] });
      } catch (error) {
        publish({ plan: null, error: error.message, errors: error.message.split("\n") });
      }
    }
    function dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return;
      publish(next);
      rebuild();
      clearTimeout(timer);
      if (state.dirty) timer = setTimeout(() => {
        save().catch(() => {
        });
      }, debounce);
    }
    async function save() {
      clearTimeout(timer);
      if (pending) {
        try {
          await pending;
        } catch (error) {
          if (state.error) throw error;
        }
        return save();
      }
      if (!state.dirty) return;
      const snapshot = state.composition;
      publish({ saving: true });
      pending = (async () => {
        try {
          await api("/api/composition", { method: "PUT", body: JSON.stringify(snapshot) });
          if (state.composition === snapshot) publish({ dirty: false, error: null, errors: [] });
        } catch (error) {
          if (state.composition === snapshot) publish({ error: error.message, errors: error.errors ?? [] });
          throw error;
        } finally {
          pending = null;
          publish({ saving: false });
        }
      })();
      await pending;
      if (state.dirty && state.composition !== snapshot) return save();
    }
    return {
      getState: () => state,
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      async load() {
        try {
          dispatch({ type: "load", project: await api("/api/project") });
        } catch (error) {
          publish({ error: error.message });
        }
      },
      setSourceSize(size) {
        sourceSize2 = size;
        rebuild();
      },
      setComposition(composition, path = null) {
        dispatch({ type: "change", composition, path, now: Date.now() });
      },
      change(path, value, options) {
        this.setComposition(changeComposition(state.composition, path, value, options), path);
      },
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      save,
      dispose() {
        disposed = true;
        clearTimeout(timer);
        listeners.clear();
      }
    };
  }

  // node_modules/mediabunny/dist/modules/src/misc.js
  function assert(x2) {
    if (!x2) {
      throw new Error("Assertion failed.");
    }
  }
  var DEG_TO_RAD = Math.PI / 180;
  var RAD_TO_DEG = 180 / Math.PI;
  var normalizeRotation = (rotation) => {
    const mappedRotation = (rotation % 360 + 360) % 360;
    if (mappedRotation === 0 || mappedRotation === 90 || mappedRotation === 180 || mappedRotation === 270) {
      return mappedRotation;
    } else {
      throw new Error(`Invalid rotation ${rotation}.`);
    }
  };
  var IDENTITY_MATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  var extractRotationFromMatrix = (matrix) => {
    const [a3, b2] = matrix;
    const radians = Math.atan2(b2, matrixIsFlipped(matrix) ? -a3 : a3);
    return normalizeRotation(roundToMultiple(radians * RAD_TO_DEG, 90));
  };
  var matrixIsFlipped = (matrix) => {
    const [a3, b2, , c3, d3] = matrix;
    const det = a3 * d3 - b2 * c3;
    return det < 0;
  };
  var multiplyMatrices = (a3, b2) => {
    const result = new Array(9);
    for (let i3 = 0; i3 < 3; i3++) {
      for (let j3 = 0; j3 < 3; j3++) {
        result[3 * i3 + j3] = a3[3 * i3] * b2[j3] + a3[3 * i3 + 1] * b2[3 + j3] + a3[3 * i3 + 2] * b2[6 + j3];
      }
    }
    return result;
  };
  var composeRotationAndFlip = (rotation1, flip1, rotation2, flip2) => {
    return {
      rotation: normalizeRotation(rotation1 + (flip1 ? -rotation2 : rotation2)),
      flip: flip1 !== flip2
    };
  };
  var last = (arr) => {
    return arr && arr[arr.length - 1];
  };
  var readExpGolomb = (bitstream) => {
    let leadingZeroBits = 0;
    while (bitstream.readBits(1) === 0 && leadingZeroBits < 32) {
      leadingZeroBits++;
    }
    if (leadingZeroBits >= 32) {
      throw new Error("Invalid exponential-Golomb code.");
    }
    const result = (1 << leadingZeroBits) - 1 + bitstream.readBits(leadingZeroBits);
    return result;
  };
  var writeExpGolomb = (bitstream, value) => {
    const codeNum = value + 1;
    const leadingZeroBits = Math.floor(Math.log2(codeNum));
    bitstream.writeBits(leadingZeroBits, 0);
    bitstream.writeBits(1, 1);
    bitstream.writeBits(leadingZeroBits, codeNum - 2 ** leadingZeroBits);
  };
  var readSignedExpGolomb = (bitstream) => {
    const codeNum = readExpGolomb(bitstream);
    return (codeNum & 1) === 0 ? -(codeNum >> 1) : codeNum + 1 >> 1;
  };
  var toUint8Array = (source) => {
    if (source.constructor === Uint8Array) {
      return source;
    } else if (ArrayBuffer.isView(source)) {
      return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else {
      return new Uint8Array(source);
    }
  };
  var toDataView = (source) => {
    if (source.constructor === DataView) {
      return source;
    } else if (ArrayBuffer.isView(source)) {
      return new DataView(source.buffer, source.byteOffset, source.byteLength);
    } else {
      return new DataView(source);
    }
  };
  var TextEncoder = typeof globalThis.TextEncoder !== "undefined" ? globalThis.TextEncoder : class TextEncoder2 {
    constructor() {
      this.encoding = "utf-8";
    }
    encode(input = "") {
      const bytes = new Uint8Array(3 * input.length);
      let n2 = 0;
      for (let i3 = 0; i3 < input.length; i3++) {
        let c3 = input.charCodeAt(i3);
        if (c3 < 128) {
          bytes[n2++] = c3;
        } else if (c3 < 2048) {
          bytes[n2++] = 192 | c3 >> 6;
          bytes[n2++] = 128 | c3 & 63;
        } else if (c3 < 55296 || c3 > 57343) {
          bytes[n2++] = 224 | c3 >> 12;
          bytes[n2++] = 128 | c3 >> 6 & 63;
          bytes[n2++] = 128 | c3 & 63;
        } else {
          const next = i3 + 1 < input.length ? input.charCodeAt(i3 + 1) : 0;
          if (c3 < 56320 && next >= 56320 && next <= 57343) {
            c3 = 65536 + (c3 - 55296 << 10) + (next - 56320);
            i3++;
            bytes[n2++] = 240 | c3 >> 18;
            bytes[n2++] = 128 | c3 >> 12 & 63;
            bytes[n2++] = 128 | c3 >> 6 & 63;
            bytes[n2++] = 128 | c3 & 63;
          } else {
            bytes[n2++] = 239;
            bytes[n2++] = 191;
            bytes[n2++] = 189;
          }
        }
      }
      return bytes.slice(0, n2);
    }
  };
  var TextDecoder2 = typeof globalThis.TextDecoder !== "undefined" ? globalThis.TextDecoder : class TextDecoder3 {
    constructor(label = "utf-8") {
      const normalized = label.trim().toLowerCase();
      if (normalized === "utf-8" || normalized === "utf8" || normalized === "unicode-1-1-utf-8") {
        this.encoding = "utf-8";
      } else if (normalized === "utf-16le" || normalized === "utf-16") {
        this.encoding = "utf-16le";
      } else if (normalized === "utf-16be") {
        this.encoding = "utf-16be";
      } else {
        throw new RangeError(`The encoding label provided ('${label}') is invalid.`);
      }
    }
    decode(input) {
      const bytes = input ? toUint8Array(input) : new Uint8Array(0);
      const units = [];
      if (this.encoding === "utf-8") {
        let i3 = bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191 ? 3 : 0;
        while (i3 < bytes.length) {
          const lead = bytes[i3];
          if (lead < 128) {
            units.push(lead);
            i3++;
            continue;
          }
          let continuationCount;
          let codePoint;
          if (lead >= 194 && lead < 224) {
            continuationCount = 1;
            codePoint = lead & 31;
          } else if (lead >= 224 && lead < 240) {
            continuationCount = 2;
            codePoint = lead & 15;
          } else if (lead >= 240 && lead < 245) {
            continuationCount = 3;
            codePoint = lead & 7;
          } else {
            units.push(65533);
            i3++;
            continue;
          }
          let lowerBound = lead === 224 ? 160 : lead === 240 ? 144 : 128;
          let upperBound = lead === 237 ? 159 : lead === 244 ? 143 : 191;
          let j3 = 1;
          for (; j3 <= continuationCount; j3++) {
            const byte = i3 + j3 < bytes.length ? bytes[i3 + j3] : 0;
            if (byte < lowerBound || byte > upperBound) {
              break;
            }
            codePoint = codePoint << 6 | byte & 63;
            lowerBound = 128;
            upperBound = 191;
          }
          i3 += j3;
          if (j3 <= continuationCount) {
            units.push(65533);
          } else if (codePoint >= 65536) {
            codePoint -= 65536;
            units.push(55296 | codePoint >> 10, 56320 | codePoint & 1023);
          } else {
            units.push(codePoint);
          }
        }
      } else {
        const littleEndian = this.encoding === "utf-16le";
        const bomLow = littleEndian ? 255 : 254;
        const bomHigh = littleEndian ? 254 : 255;
        let i3 = bytes.length >= 2 && bytes[0] === bomLow && bytes[1] === bomHigh ? 2 : 0;
        while (i3 + 1 < bytes.length) {
          const unit = littleEndian ? bytes[i3] | bytes[i3 + 1] << 8 : bytes[i3] << 8 | bytes[i3 + 1];
          i3 += 2;
          if (unit >= 55296 && unit <= 56319) {
            const next = i3 + 1 < bytes.length ? littleEndian ? bytes[i3] | bytes[i3 + 1] << 8 : bytes[i3] << 8 | bytes[i3 + 1] : -1;
            if (next >= 56320 && next <= 57343) {
              units.push(unit, next);
              i3 += 2;
            } else {
              units.push(65533);
            }
          } else if (unit >= 56320 && unit <= 57343) {
            units.push(65533);
          } else {
            units.push(unit);
          }
        }
        if (i3 < bytes.length) {
          units.push(65533);
        }
      }
      let result = "";
      for (let i3 = 0; i3 < units.length; i3 += 8192) {
        result += String.fromCharCode(...units.slice(i3, i3 + 8192));
      }
      return result;
    }
  };
  var textDecoder = /* @__PURE__ */ new TextDecoder2();
  var invertObject = (object2) => {
    return Object.fromEntries(Object.entries(object2).map(([key, value]) => [value, key]));
  };
  var COLOR_PRIMARIES_MAP = {
    bt709: 1,
    // ITU-R BT.709
    bt470bg: 5,
    // ITU-R BT.470BG
    smpte170m: 6,
    // ITU-R BT.601 525 - SMPTE 170M
    bt2020: 9,
    // ITU-R BT.202
    smpte432: 12
    // SMPTE EG 432-1
  };
  var COLOR_PRIMARIES_MAP_INVERSE = /* @__PURE__ */ invertObject(COLOR_PRIMARIES_MAP);
  var TRANSFER_CHARACTERISTICS_MAP = {
    "bt709": 1,
    // ITU-R BT.709
    "smpte170m": 6,
    // SMPTE 170M
    "linear": 8,
    // Linear transfer characteristics
    "iec61966-2-1": 13,
    // IEC 61966-2-1
    "pq": 16,
    // Rec. ITU-R BT.2100-2 perceptual quantization (PQ) system
    "hlg": 18
    // Rec. ITU-R BT.2100-2 hybrid loggamma (HLG) system
  };
  var TRANSFER_CHARACTERISTICS_MAP_INVERSE = /* @__PURE__ */ invertObject(TRANSFER_CHARACTERISTICS_MAP);
  var MATRIX_COEFFICIENTS_MAP = {
    "rgb": 0,
    // Identity
    "bt709": 1,
    // ITU-R BT.709
    "bt470bg": 5,
    // ITU-R BT.470BG
    "smpte170m": 6,
    // SMPTE 170M
    "bt2020-ncl": 9
    // ITU-R BT.2020-2 (non-constant luminance)
  };
  var MATRIX_COEFFICIENTS_MAP_INVERSE = /* @__PURE__ */ invertObject(MATRIX_COEFFICIENTS_MAP);
  var colorSpaceIsComplete = (colorSpace) => {
    return !!colorSpace && !!colorSpace.primaries && !!colorSpace.transfer && !!colorSpace.matrix && colorSpace.fullRange !== void 0;
  };
  var EMPTY_COLOR_SPACE = {
    primaries: void 0,
    transfer: void 0,
    matrix: void 0,
    fullRange: void 0
  };
  var isAllowSharedBufferSource = (x2) => {
    return x2 instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && x2 instanceof SharedArrayBuffer || ArrayBuffer.isView(x2);
  };
  var HEX_STRING_REGEX = /^[0-9a-fA-F]+$/;
  var bytesToHexString = (bytes) => {
    return [...bytes].map((x2) => x2.toString(16).padStart(2, "0")).join("");
  };
  var hexStringToBytes = (hexString) => {
    assert(hexString.length % 2 === 0);
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i3 = 0; i3 < hexString.length; i3 += 2) {
      bytes[i3 / 2] = parseInt(hexString.slice(i3, i3 + 2), 16);
    }
    return bytes;
  };
  var reverseBitsU32 = (x2) => {
    x2 = x2 >> 1 & 1431655765 | (x2 & 1431655765) << 1;
    x2 = x2 >> 2 & 858993459 | (x2 & 858993459) << 2;
    x2 = x2 >> 4 & 252645135 | (x2 & 252645135) << 4;
    x2 = x2 >> 8 & 16711935 | (x2 & 16711935) << 8;
    x2 = x2 >> 16 & 65535 | (x2 & 65535) << 16;
    return x2 >>> 0;
  };
  var binarySearchExact = (arr, key, valueGetter) => {
    let low = 0;
    let high = arr.length - 1;
    let ans = -1;
    while (low <= high) {
      const mid = low + high >> 1;
      const midVal = valueGetter(arr[mid]);
      if (midVal === key) {
        ans = mid;
        high = mid - 1;
      } else if (midVal < key) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return ans;
  };
  var binarySearchLessOrEqual = (arr, key, valueGetter) => {
    let low = 0;
    let high = arr.length - 1;
    let ans = -1;
    while (low <= high) {
      const mid = low + (high - low + 1) / 2 | 0;
      const midVal = valueGetter(arr[mid]);
      if (midVal <= key) {
        ans = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return ans;
  };
  var insertSorted = (arr, item, valueGetter) => {
    const insertionIndex = binarySearchLessOrEqual(arr, valueGetter(item), valueGetter);
    arr.splice(insertionIndex + 1, 0, item);
  };
  var promiseWithResolvers = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
  var removeItem = (arr, item) => {
    const index = arr.indexOf(item);
    if (index !== -1) {
      arr.splice(index, 1);
    }
  };
  var findLastIndex = (arr, predicate) => {
    for (let i3 = arr.length - 1; i3 >= 0; i3--) {
      if (predicate(arr[i3])) {
        return i3;
      }
    }
    return -1;
  };
  var toAsyncIterator = async function* (source) {
    if (Symbol.iterator in source) {
      yield* source[Symbol.iterator]();
    } else {
      yield* source[Symbol.asyncIterator]();
    }
  };
  var validateAnyIterable = (iterable) => {
    if (!(Symbol.iterator in iterable) && !(Symbol.asyncIterator in iterable)) {
      throw new TypeError("Argument must be an iterable or async iterable.");
    }
  };
  var assertNever = (x2) => {
    throw new Error(`Unexpected value: ${x2}`);
  };
  var getUint24 = (view, byteOffset, littleEndian) => {
    const byte1 = view.getUint8(byteOffset);
    const byte2 = view.getUint8(byteOffset + 1);
    const byte3 = view.getUint8(byteOffset + 2);
    if (littleEndian) {
      return byte1 | byte2 << 8 | byte3 << 16;
    } else {
      return byte1 << 16 | byte2 << 8 | byte3;
    }
  };
  var setUint24 = (view, byteOffset, value, littleEndian) => {
    value = value >>> 0;
    value = value & 16777215;
    if (littleEndian) {
      view.setUint8(byteOffset, value & 255);
      view.setUint8(byteOffset + 1, value >>> 8 & 255);
      view.setUint8(byteOffset + 2, value >>> 16 & 255);
    } else {
      view.setUint8(byteOffset, value >>> 16 & 255);
      view.setUint8(byteOffset + 1, value >>> 8 & 255);
      view.setUint8(byteOffset + 2, value & 255);
    }
  };
  var mapAsyncGenerator = (generator, map) => {
    return {
      async next() {
        const result = await generator.next();
        if (result.done) {
          return { value: void 0, done: true };
        } else {
          return { value: map(result.value), done: false };
        }
      },
      return() {
        return generator.return();
      },
      throw(error) {
        return generator.throw(error);
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  };
  var clamp5 = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
  };
  var UNDETERMINED_LANGUAGE = "und";
  var roundIfAlmostInteger = (value) => {
    const rounded2 = Math.round(value);
    if (Math.abs(value / rounded2 - 1) < 10 * Number.EPSILON) {
      return rounded2;
    } else {
      return value;
    }
  };
  var roundToMultiple = (value, multiple) => {
    return Math.round(value / multiple) * multiple;
  };
  var roundToDivisor = (value, multiple) => {
    return Math.round(value * multiple) / multiple;
  };
  var popcount = (value) => {
    let count = 0;
    while (value !== 0) {
      value &= value - 1;
      count++;
    }
    return count;
  };
  var ISO_639_2_REGEX = /^[a-z]{3}$/;
  var isIso639Dash2LanguageCode = (x2) => {
    return ISO_639_2_REGEX.test(x2);
  };
  var SECOND_TO_MICROSECOND_FACTOR = 1e6 * (1 + Number.EPSILON);
  var mergeRequestInit = (init1, init2) => {
    const merged = { ...init1, ...init2 };
    if (init1.headers || init2.headers) {
      const headers1 = init1.headers ? normalizeHeaders(init1.headers) : {};
      const headers2 = init2.headers ? normalizeHeaders(init2.headers) : {};
      const mergedHeaders = { ...headers1 };
      Object.entries(headers2).forEach(([key2, value2]) => {
        const existingKey = Object.keys(mergedHeaders).find((key1) => key1.toLowerCase() === key2.toLowerCase());
        if (existingKey) {
          delete mergedHeaders[existingKey];
        }
        mergedHeaders[key2] = value2;
      });
      merged.headers = mergedHeaders;
    }
    return merged;
  };
  var normalizeHeaders = (headers) => {
    if (headers instanceof Headers) {
      const result = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    if (Array.isArray(headers)) {
      const result = {};
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    }
    return headers;
  };
  var retriedFetch = async (fetchFn, url, requestInit, getRetryDelay, shouldStop) => {
    let attempts = 0;
    while (true) {
      try {
        return await fetchFn(url, requestInit);
      } catch (error) {
        if (shouldStop()) {
          throw error;
        }
        attempts++;
        const retryDelayInSeconds = getRetryDelay(attempts, error, url);
        if (retryDelayInSeconds === null) {
          throw error;
        }
        Logging._error("Retrying failed fetch. Error:", error);
        if (!Number.isFinite(retryDelayInSeconds) || retryDelayInSeconds < 0) {
          throw new TypeError("Retry delay must be a non-negative finite number.");
        }
        if (retryDelayInSeconds > 0) {
          await wait(1e3 * retryDelayInSeconds);
        }
        if (shouldStop()) {
          throw error;
        }
      }
    }
  };
  var CallSerializer = class {
    constructor() {
      this.currentPromise = Promise.resolve();
    }
    call(fn) {
      return this.currentPromise = this.currentPromise.then(fn);
    }
  };
  var isWebKitCache = null;
  var isWebKit = () => {
    if (isWebKitCache !== null) {
      return isWebKitCache;
    }
    return isWebKitCache = !!(typeof navigator !== "undefined" && // eslint-disable-next-line @typescript-eslint/no-deprecated
    (navigator.vendor?.match(/apple/i) || /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) || /\b(iPad|iPhone|iPod)\b/.test(navigator.userAgent)));
  };
  var isFirefoxCache = null;
  var isFirefox = () => {
    if (isFirefoxCache !== null) {
      return isFirefoxCache;
    }
    return isFirefoxCache = typeof navigator !== "undefined" && navigator.userAgent?.includes("Firefox");
  };
  var isChromiumCache = null;
  var isChromium = () => {
    if (isChromiumCache !== null) {
      return isChromiumCache;
    }
    return isChromiumCache = !!(typeof navigator !== "undefined" && (navigator.vendor?.includes("Google Inc") || /Chrome/.test(navigator.userAgent)));
  };
  var missingWebCodecsClassMessage = (className) => {
    if (typeof globalThis.isSecureContext !== "undefined" && !globalThis.isSecureContext) {
      return `${className} is not available in this environment; this may be because this page is running in an insecure context. Try serving your page over HTTPS or use localhost.`;
    }
    return `${className} is not available in this environment.`;
  };
  var NativePromiseConstructor = (async () => {
  })().constructor;
  var isThenable = (value) => {
    if (value instanceof NativePromiseConstructor || value instanceof Promise) {
      return true;
    }
    return typeof value?.then === "function";
  };
  var closedIntervalsOverlap = (startA, endA, startB, endB) => {
    return startA <= endB && startB <= endA;
  };
  var uint8ArraysAreEqual = (a3, b2) => {
    if (a3.length !== b2.length) {
      return false;
    }
    for (let i3 = 0; i3 < a3.length; i3++) {
      if (a3[i3] !== b2[i3]) {
        return false;
      }
    }
    return true;
  };
  var polyfillSymbolDispose = () => {
    Symbol.dispose ??= Symbol("Symbol.dispose");
  };
  var isNumber = (x2) => {
    return typeof x2 === "number" && !Number.isNaN(x2);
  };
  var arrayCount = (array, predicate) => {
    let count = 0;
    for (let i3 = 0; i3 < array.length; i3++) {
      if (predicate(array[i3])) {
        count++;
      }
    }
    return count;
  };
  var arrayArgmin = (array, getValue) => {
    let minIndex = -1;
    let minValue = Infinity;
    for (let i3 = 0; i3 < array.length; i3++) {
      const value = getValue(array[i3]);
      if (value < minValue) {
        minValue = value;
        minIndex = i3;
      }
    }
    return minIndex;
  };
  var simplifyRational = (rational) => {
    assert(Number.isInteger(rational.num));
    assert(Number.isInteger(rational.den));
    assert(rational.den !== 0);
    let a3 = Math.abs(rational.num);
    let b2 = Math.abs(rational.den);
    while (b2 !== 0) {
      const t3 = a3 % b2;
      a3 = b2;
      b2 = t3;
    }
    const gcd = a3 || 1;
    return {
      num: rational.num / gcd,
      den: rational.den / gcd
    };
  };
  var validateRectangle = (rect, propertyPath) => {
    if (typeof rect !== "object" || !rect) {
      throw new TypeError(`${propertyPath} must be an object.`);
    }
    if (!Number.isInteger(rect.left) || rect.left < 0) {
      throw new TypeError(`${propertyPath}.left must be a non-negative integer.`);
    }
    if (!Number.isInteger(rect.top) || rect.top < 0) {
      throw new TypeError(`${propertyPath}.top must be a non-negative integer.`);
    }
    if (!Number.isInteger(rect.width) || rect.width < 0) {
      throw new TypeError(`${propertyPath}.width must be a non-negative integer.`);
    }
    if (!Number.isInteger(rect.height) || rect.height < 0) {
      throw new TypeError(`${propertyPath}.height must be a non-negative integer.`);
    }
  };
  var wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
  var EventEmitter = class {
    constructor() {
      this._listeners = /* @__PURE__ */ new Map();
    }
    /** Registers a listener for the given event. Returns a function that, when called, removes the listener again. */
    on(event, listener, options) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, /* @__PURE__ */ new Set());
      }
      const entry = { fn: listener, once: options?.once ?? false };
      this._listeners.get(event).add(entry);
      return () => {
        this._listeners.get(event)?.delete(entry);
      };
    }
    /** @internal */
    _emit(...args) {
      const [event, data] = args;
      const listeners = this._listeners.get(event);
      if (!listeners) {
        return;
      }
      for (const entry of listeners) {
        try {
          entry.fn(data);
        } catch (error) {
          console.error(error);
        }
        if (entry.once) {
          listeners.delete(entry);
        }
      }
    }
  };

  // node_modules/mediabunny/dist/modules/src/logging.js
  var LogLevel;
  (function(LogLevel2) {
    LogLevel2[LogLevel2["Silent"] = 0] = "Silent";
    LogLevel2[LogLevel2["Errors"] = 1] = "Errors";
    LogLevel2[LogLevel2["Warnings"] = 2] = "Warnings";
    LogLevel2[LogLevel2["Info"] = 3] = "Info";
  })(LogLevel || (LogLevel = {}));
  var Logging = class _Logging {
    constructor() {
    }
    /** The current log level. Defaults to {@link LogLevel.Info}. */
    static get level() {
      return _Logging._level;
    }
    static set level(value) {
      if (value !== LogLevel.Silent && value !== LogLevel.Errors && value !== LogLevel.Warnings && value !== LogLevel.Info) {
        throw new TypeError("Invalid log level. Use one of the values of the LogLevel enum.");
      }
      _Logging._level = value;
    }
    /** @internal */
    static get _emitter() {
      return _Logging._emitterInstance ??= new EventEmitter();
    }
    /** Registers a listener for a log event. Returns a function that, when called, removes the listener again. */
    static on(event, listener, options) {
      return _Logging._emitter.on(event, listener, options);
    }
    /** @internal */
    static _error(...args) {
      _Logging._emitter._emit("error", args);
      if (_Logging._level >= LogLevel.Errors) {
        console.error(...args);
      }
    }
    /** @internal */
    static _warn(...args) {
      _Logging._emitter._emit("warn", args);
      if (_Logging._level >= LogLevel.Warnings) {
        console.warn(...args);
      }
    }
    /** @internal */
    static _info(...args) {
      _Logging._emitter._emit("info", args);
      if (_Logging._level >= LogLevel.Info) {
        console.info(...args);
      }
    }
  };
  Logging._level = LogLevel.Info;
  Logging._emitterInstance = null;

  // node_modules/mediabunny/dist/modules/src/metadata.js
  var RichImageData = class {
    /** Creates a new {@link RichImageData}. */
    constructor(data, mimeType) {
      this.data = data;
      this.mimeType = mimeType;
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("data must be a Uint8Array.");
      }
      if (typeof mimeType !== "string") {
        throw new TypeError("mimeType must be a string.");
      }
    }
  };
  var DEFAULT_TRACK_DISPOSITION = {
    default: true,
    primary: true,
    forced: false,
    original: false,
    commentary: false,
    hearingImpaired: false,
    visuallyImpaired: false
  };

  // node_modules/mediabunny/dist/modules/shared/bitstream.js
  var Bitstream = class _Bitstream {
    constructor(bytes) {
      this.bytes = bytes;
      this.pos = 0;
    }
    seekToByte(byteOffset) {
      this.pos = 8 * byteOffset;
    }
    readBit() {
      const byteIndex = Math.floor(this.pos / 8);
      const byte = this.bytes[byteIndex] ?? 0;
      const bitIndex = 7 - (this.pos & 7);
      const bit = (byte & 1 << bitIndex) >> bitIndex;
      this.pos++;
      return bit;
    }
    readBits(n2) {
      if (n2 === 1) {
        return this.readBit();
      }
      let result = 0;
      for (let i3 = 0; i3 < n2; i3++) {
        result <<= 1;
        result |= this.readBit();
      }
      return result;
    }
    writeBits(n2, value) {
      const end = this.pos + n2;
      for (let i3 = this.pos; i3 < end; i3++) {
        const byteIndex = Math.floor(i3 / 8);
        let byte = this.bytes[byteIndex];
        const bitIndex = 7 - (i3 & 7);
        byte &= ~(1 << bitIndex);
        byte |= (value & 1 << end - i3 - 1) >> end - i3 - 1 << bitIndex;
        this.bytes[byteIndex] = byte;
      }
      this.pos = end;
    }
    copyBits(n2, other) {
      let i3 = 0;
      for (i3; i3 < n2 - 7; i3 += 8) {
        this.writeBits(8, other.readBits(8));
      }
      const leftover = n2 - i3;
      if (leftover > 0) {
        this.writeBits(leftover, other.readBits(leftover));
      }
    }
    readAlignedByte() {
      if (this.pos % 8 !== 0) {
        throw new Error("Bitstream is not byte-aligned.");
      }
      const byteIndex = this.pos / 8;
      const byte = this.bytes[byteIndex] ?? 0;
      this.pos += 8;
      return byte;
    }
    skipBits(n2) {
      this.pos += n2;
    }
    getBitsLeft() {
      return this.bytes.length * 8 - this.pos;
    }
    clone() {
      const clone3 = new _Bitstream(this.bytes);
      clone3.pos = this.pos;
      return clone3;
    }
  };

  // node_modules/mediabunny/dist/modules/shared/aac-misc.js
  var aacFrequencyTable = [
    96e3,
    88200,
    64e3,
    48e3,
    44100,
    32e3,
    24e3,
    22050,
    16e3,
    12e3,
    11025,
    8e3,
    7350
  ];
  var aacChannelMap = [-1, 1, 2, 3, 4, 5, 6, 8];
  var parseAacAudioSpecificConfig = (bytes) => {
    if (!bytes || bytes.byteLength < 2) {
      throw new TypeError("AAC description must be at least 2 bytes long.");
    }
    const bitstream = new Bitstream(bytes);
    const objectType = readAacObjectType(bitstream);
    const { frequencyIndex, sampleRate } = readAacSamplingFrequency(bitstream);
    const channelConfiguration = bitstream.readBits(4);
    let numberOfChannels = null;
    if (channelConfiguration >= 1 && channelConfiguration <= 7) {
      numberOfChannels = aacChannelMap[channelConfiguration];
    }
    let coreObjectType = objectType;
    let psPresent = false;
    let outputSampleRate = sampleRate;
    if (objectType === 5 || objectType === 29) {
      psPresent = objectType === 29;
      outputSampleRate = readAacSamplingFrequency(bitstream).sampleRate;
      coreObjectType = readAacObjectType(bitstream);
      if (coreObjectType === 22) {
        bitstream.skipBits(4);
      }
    } else {
      while (bitstream.getBitsLeft() > 15) {
        const searchStart = bitstream.pos;
        if (bitstream.readBits(11) !== 695) {
          bitstream.pos = searchStart + 1;
          continue;
        }
        if (readAacObjectType(bitstream) === 5 && bitstream.readBits(1)) {
          outputSampleRate = readAacSamplingFrequency(bitstream).sampleRate;
          if (bitstream.getBitsLeft() > 11 && bitstream.readBits(11) === 1352) {
            psPresent = !!bitstream.readBits(1);
          }
        }
        break;
      }
    }
    if (numberOfChannels !== null && numberOfChannels > 1) {
      psPresent = false;
    }
    return {
      objectType,
      coreObjectType,
      frequencyIndex,
      channelConfiguration,
      outputSampleRate,
      outputNumberOfChannels: psPresent && numberOfChannels === 1 ? 2 : numberOfChannels
    };
  };
  var readAacObjectType = (bitstream) => {
    const objectType = bitstream.readBits(5);
    return objectType === 31 ? 32 + bitstream.readBits(6) : objectType;
  };
  var readAacSamplingFrequency = (bitstream) => {
    const frequencyIndex = bitstream.readBits(4);
    if (frequencyIndex === 15) {
      return {
        frequencyIndex,
        sampleRate: bitstream.readBits(24)
      };
    }
    return {
      frequencyIndex,
      sampleRate: frequencyIndex < aacFrequencyTable.length ? aacFrequencyTable[frequencyIndex] : null
    };
  };

  // node_modules/mediabunny/dist/modules/shared/ac3-misc.js
  var AC3_SAMPLE_RATES = [48e3, 44100, 32e3];
  var EAC3_REDUCED_SAMPLE_RATES = [24e3, 22050, 16e3];

  // node_modules/mediabunny/dist/modules/src/codec-data.js
  var AvcNalUnitType;
  (function(AvcNalUnitType2) {
    AvcNalUnitType2[AvcNalUnitType2["NON_IDR_SLICE"] = 1] = "NON_IDR_SLICE";
    AvcNalUnitType2[AvcNalUnitType2["SLICE_DPA"] = 2] = "SLICE_DPA";
    AvcNalUnitType2[AvcNalUnitType2["SLICE_DPB"] = 3] = "SLICE_DPB";
    AvcNalUnitType2[AvcNalUnitType2["SLICE_DPC"] = 4] = "SLICE_DPC";
    AvcNalUnitType2[AvcNalUnitType2["IDR"] = 5] = "IDR";
    AvcNalUnitType2[AvcNalUnitType2["SEI"] = 6] = "SEI";
    AvcNalUnitType2[AvcNalUnitType2["SPS"] = 7] = "SPS";
    AvcNalUnitType2[AvcNalUnitType2["PPS"] = 8] = "PPS";
    AvcNalUnitType2[AvcNalUnitType2["AUD"] = 9] = "AUD";
    AvcNalUnitType2[AvcNalUnitType2["SPS_EXT"] = 13] = "SPS_EXT";
  })(AvcNalUnitType || (AvcNalUnitType = {}));
  var HevcNalUnitType;
  (function(HevcNalUnitType2) {
    HevcNalUnitType2[HevcNalUnitType2["RASL_N"] = 8] = "RASL_N";
    HevcNalUnitType2[HevcNalUnitType2["RASL_R"] = 9] = "RASL_R";
    HevcNalUnitType2[HevcNalUnitType2["BLA_W_LP"] = 16] = "BLA_W_LP";
    HevcNalUnitType2[HevcNalUnitType2["RSV_IRAP_VCL23"] = 23] = "RSV_IRAP_VCL23";
    HevcNalUnitType2[HevcNalUnitType2["VPS_NUT"] = 32] = "VPS_NUT";
    HevcNalUnitType2[HevcNalUnitType2["SPS_NUT"] = 33] = "SPS_NUT";
    HevcNalUnitType2[HevcNalUnitType2["PPS_NUT"] = 34] = "PPS_NUT";
    HevcNalUnitType2[HevcNalUnitType2["AUD_NUT"] = 35] = "AUD_NUT";
    HevcNalUnitType2[HevcNalUnitType2["PREFIX_SEI_NUT"] = 39] = "PREFIX_SEI_NUT";
    HevcNalUnitType2[HevcNalUnitType2["SUFFIX_SEI_NUT"] = 40] = "SUFFIX_SEI_NUT";
  })(HevcNalUnitType || (HevcNalUnitType = {}));
  var iterateNalUnitsInAnnexB = function* (packetData) {
    let i3 = 0;
    let nalStart = -1;
    while (i3 < packetData.length - 2) {
      const zeroIndex = packetData.indexOf(0, i3);
      if (zeroIndex === -1 || zeroIndex >= packetData.length - 2) {
        break;
      }
      i3 = zeroIndex;
      let startCodeLength = 0;
      if (i3 + 3 < packetData.length && packetData[i3 + 1] === 0 && packetData[i3 + 2] === 0 && packetData[i3 + 3] === 1) {
        startCodeLength = 4;
      } else if (packetData[i3 + 1] === 0 && packetData[i3 + 2] === 1) {
        startCodeLength = 3;
      }
      if (startCodeLength === 0) {
        i3++;
        continue;
      }
      if (nalStart !== -1 && i3 > nalStart) {
        yield {
          offset: nalStart,
          length: i3 - nalStart
        };
      }
      nalStart = i3 + startCodeLength;
      i3 = nalStart;
    }
    if (nalStart !== -1 && nalStart < packetData.length) {
      yield {
        offset: nalStart,
        length: packetData.length - nalStart
      };
    }
  };
  var iterateNalUnitsInLengthPrefixed = function* (packetData, lengthSize) {
    let offset = 0;
    const dataView = new DataView(packetData.buffer, packetData.byteOffset, packetData.byteLength);
    while (offset + lengthSize <= packetData.length) {
      let nalUnitLength;
      if (lengthSize === 1) {
        nalUnitLength = dataView.getUint8(offset);
      } else if (lengthSize === 2) {
        nalUnitLength = dataView.getUint16(offset, false);
      } else if (lengthSize === 3) {
        nalUnitLength = getUint24(dataView, offset, false);
      } else {
        assert(lengthSize === 4);
        nalUnitLength = dataView.getUint32(offset, false);
      }
      offset += lengthSize;
      yield {
        offset,
        length: nalUnitLength
      };
      offset += nalUnitLength;
    }
  };
  var iterateAvcNalUnits = (packetData, decoderConfig) => {
    if (decoderConfig.description) {
      const bytes = toUint8Array(decoderConfig.description);
      const lengthSizeMinusOne = bytes[4] & 3;
      const lengthSize = lengthSizeMinusOne + 1;
      return iterateNalUnitsInLengthPrefixed(packetData, lengthSize);
    } else {
      return iterateNalUnitsInAnnexB(packetData);
    }
  };
  var extractNalUnitTypeForAvc = (byte) => {
    return byte & 31;
  };
  var removeEmulationPreventionBytes = (data) => {
    const result = [];
    const len = data.length;
    for (let i3 = 0; i3 < len; i3++) {
      if (i3 + 2 < len && data[i3] === 0 && data[i3 + 1] === 0 && data[i3 + 2] === 3) {
        result.push(0, 0);
        i3 += 2;
      } else {
        result.push(data[i3]);
      }
    }
    return new Uint8Array(result);
  };
  var addEmulationPreventionBytes = (data) => {
    const result = [];
    let zeroCount = 0;
    for (const byte of data) {
      if (zeroCount === 2 && byte <= 3) {
        result.push(3);
        zeroCount = 0;
      }
      result.push(byte);
      zeroCount = byte === 0 ? zeroCount + 1 : 0;
    }
    return new Uint8Array(result);
  };
  var ANNEX_B_START_CODE = new Uint8Array([0, 0, 0, 1]);
  var concatNalUnitsInAnnexB = (nalUnits) => {
    const totalLength = nalUnits.reduce((a3, b2) => a3 + ANNEX_B_START_CODE.byteLength + b2.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const nalUnit of nalUnits) {
      result.set(ANNEX_B_START_CODE, offset);
      offset += ANNEX_B_START_CODE.byteLength;
      result.set(nalUnit, offset);
      offset += nalUnit.byteLength;
    }
    return result;
  };
  var concatNalUnitsInLengthPrefixed = (nalUnits, lengthSize) => {
    const totalLength = nalUnits.reduce((a3, b2) => a3 + lengthSize + b2.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const nalUnit of nalUnits) {
      const dataView = new DataView(result.buffer, result.byteOffset, result.byteLength);
      switch (lengthSize) {
        case 1:
          dataView.setUint8(offset, nalUnit.byteLength);
          break;
        case 2:
          dataView.setUint16(offset, nalUnit.byteLength, false);
          break;
        case 3:
          setUint24(dataView, offset, nalUnit.byteLength, false);
          break;
        case 4:
          dataView.setUint32(offset, nalUnit.byteLength, false);
          break;
      }
      offset += lengthSize;
      result.set(nalUnit, offset);
      offset += nalUnit.byteLength;
    }
    return result;
  };
  var concatAvcNalUnits = (nalUnits, decoderConfig) => {
    if (decoderConfig.description) {
      const bytes = toUint8Array(decoderConfig.description);
      const lengthSizeMinusOne = bytes[4] & 3;
      const lengthSize = lengthSizeMinusOne + 1;
      return concatNalUnitsInLengthPrefixed(nalUnits, lengthSize);
    } else {
      return concatNalUnitsInAnnexB(nalUnits);
    }
  };
  var extractAvcDecoderConfigurationRecord = (packetData) => {
    try {
      const spsUnits = [];
      const ppsUnits = [];
      const spsExtUnits = [];
      for (const loc of iterateNalUnitsInAnnexB(packetData)) {
        const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
        const type = extractNalUnitTypeForAvc(nalUnit[0]);
        if (type === AvcNalUnitType.SPS) {
          spsUnits.push(nalUnit);
        } else if (type === AvcNalUnitType.PPS) {
          ppsUnits.push(nalUnit);
        } else if (type === AvcNalUnitType.SPS_EXT) {
          spsExtUnits.push(nalUnit);
        }
      }
      if (spsUnits.length === 0) {
        return null;
      }
      if (ppsUnits.length === 0) {
        return null;
      }
      const spsData = spsUnits[0];
      const spsInfo = parseAvcSps(spsData);
      assert(spsInfo !== null);
      const hasExtendedData = spsInfo.profileIdc === 100 || spsInfo.profileIdc === 110 || spsInfo.profileIdc === 122 || spsInfo.profileIdc === 144;
      return {
        configurationVersion: 1,
        avcProfileIndication: spsInfo.profileIdc,
        profileCompatibility: spsInfo.constraintFlags,
        avcLevelIndication: spsInfo.levelIdc,
        lengthSizeMinusOne: 3,
        // Typically 4 bytes for length field
        sequenceParameterSets: spsUnits,
        pictureParameterSets: ppsUnits,
        chromaFormat: hasExtendedData ? spsInfo.chromaFormatIdc : null,
        bitDepthLumaMinus8: hasExtendedData ? spsInfo.bitDepthLumaMinus8 : null,
        bitDepthChromaMinus8: hasExtendedData ? spsInfo.bitDepthChromaMinus8 : null,
        sequenceParameterSetExt: hasExtendedData ? spsExtUnits : null
      };
    } catch (error) {
      Logging._error("Error building AVC Decoder Configuration Record:", error);
      return null;
    }
  };
  var serializeAvcDecoderConfigurationRecord = (record) => {
    const bytes = [];
    bytes.push(record.configurationVersion);
    bytes.push(record.avcProfileIndication);
    bytes.push(record.profileCompatibility);
    bytes.push(record.avcLevelIndication);
    bytes.push(252 | record.lengthSizeMinusOne & 3);
    bytes.push(224 | record.sequenceParameterSets.length & 31);
    for (const sps of record.sequenceParameterSets) {
      const length = sps.byteLength;
      bytes.push(length >> 8);
      bytes.push(length & 255);
      for (let i3 = 0; i3 < length; i3++) {
        bytes.push(sps[i3]);
      }
    }
    bytes.push(record.pictureParameterSets.length);
    for (const pps of record.pictureParameterSets) {
      const length = pps.byteLength;
      bytes.push(length >> 8);
      bytes.push(length & 255);
      for (let i3 = 0; i3 < length; i3++) {
        bytes.push(pps[i3]);
      }
    }
    if ((record.avcProfileIndication === 100 || record.avcProfileIndication === 110 || record.avcProfileIndication === 122 || record.avcProfileIndication === 144) && record.chromaFormat !== null) {
      assert(record.bitDepthLumaMinus8 !== null);
      assert(record.bitDepthChromaMinus8 !== null);
      assert(record.sequenceParameterSetExt !== null);
      bytes.push(252 | record.chromaFormat & 3);
      bytes.push(248 | record.bitDepthLumaMinus8 & 7);
      bytes.push(248 | record.bitDepthChromaMinus8 & 7);
      bytes.push(record.sequenceParameterSetExt.length);
      for (const spsExt of record.sequenceParameterSetExt) {
        const length = spsExt.byteLength;
        bytes.push(length >> 8);
        bytes.push(length & 255);
        for (let i3 = 0; i3 < length; i3++) {
          bytes.push(spsExt[i3]);
        }
      }
    }
    return new Uint8Array(bytes);
  };
  var deserializeAvcDecoderConfigurationRecord = (data) => {
    try {
      const view = toDataView(data);
      let offset = 0;
      const configurationVersion = view.getUint8(offset++);
      const avcProfileIndication = view.getUint8(offset++);
      const profileCompatibility = view.getUint8(offset++);
      const avcLevelIndication = view.getUint8(offset++);
      const lengthSizeMinusOne = view.getUint8(offset++) & 3;
      const numOfSequenceParameterSets = view.getUint8(offset++) & 31;
      const sequenceParameterSets = [];
      for (let i3 = 0; i3 < numOfSequenceParameterSets; i3++) {
        const length = view.getUint16(offset, false);
        offset += 2;
        sequenceParameterSets.push(data.subarray(offset, offset + length));
        offset += length;
      }
      const numOfPictureParameterSets = view.getUint8(offset++);
      const pictureParameterSets = [];
      for (let i3 = 0; i3 < numOfPictureParameterSets; i3++) {
        const length = view.getUint16(offset, false);
        offset += 2;
        pictureParameterSets.push(data.subarray(offset, offset + length));
        offset += length;
      }
      const record = {
        configurationVersion,
        avcProfileIndication,
        profileCompatibility,
        avcLevelIndication,
        lengthSizeMinusOne,
        sequenceParameterSets,
        pictureParameterSets,
        chromaFormat: null,
        bitDepthLumaMinus8: null,
        bitDepthChromaMinus8: null,
        sequenceParameterSetExt: null
      };
      if ((avcProfileIndication === 100 || avcProfileIndication === 110 || avcProfileIndication === 122 || avcProfileIndication === 144) && offset + 4 <= data.length) {
        const chromaFormat = view.getUint8(offset++) & 3;
        const bitDepthLumaMinus8 = view.getUint8(offset++) & 7;
        const bitDepthChromaMinus8 = view.getUint8(offset++) & 7;
        const numOfSequenceParameterSetExt = view.getUint8(offset++);
        record.chromaFormat = chromaFormat;
        record.bitDepthLumaMinus8 = bitDepthLumaMinus8;
        record.bitDepthChromaMinus8 = bitDepthChromaMinus8;
        const sequenceParameterSetExt = [];
        for (let i3 = 0; i3 < numOfSequenceParameterSetExt; i3++) {
          const length = view.getUint16(offset, false);
          offset += 2;
          sequenceParameterSetExt.push(data.subarray(offset, offset + length));
          offset += length;
        }
        record.sequenceParameterSetExt = sequenceParameterSetExt;
      }
      return record;
    } catch (error) {
      Logging._error("Error deserializing AVC Decoder Configuration Record:", error);
      return null;
    }
  };
  var AVC_HEVC_ASPECT_RATIO_IDC_TABLE = {
    1: { num: 1, den: 1 },
    2: { num: 12, den: 11 },
    3: { num: 10, den: 11 },
    4: { num: 16, den: 11 },
    5: { num: 40, den: 33 },
    6: { num: 24, den: 11 },
    7: { num: 20, den: 11 },
    8: { num: 32, den: 11 },
    9: { num: 80, den: 33 },
    10: { num: 18, den: 11 },
    11: { num: 15, den: 11 },
    12: { num: 64, den: 33 },
    13: { num: 160, den: 99 },
    14: { num: 4, den: 3 },
    15: { num: 3, den: 2 },
    16: { num: 2, den: 1 }
  };
  var parseAvcSps = (sps) => {
    try {
      const emulationUnpreventedBytes = removeEmulationPreventionBytes(sps);
      const bitstream = new Bitstream(emulationUnpreventedBytes);
      bitstream.skipBits(1);
      bitstream.skipBits(2);
      const nalUnitType = bitstream.readBits(5);
      if (nalUnitType !== 7) {
        return null;
      }
      const profileIdc = bitstream.readAlignedByte();
      const constraintFlags = bitstream.readAlignedByte();
      const levelIdc = bitstream.readAlignedByte();
      readExpGolomb(bitstream);
      let chromaFormatIdc = 1;
      let bitDepthLumaMinus8 = 0;
      let bitDepthChromaMinus8 = 0;
      let separateColourPlaneFlag = 0;
      if (profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244 || profileIdc === 44 || profileIdc === 83 || profileIdc === 86 || profileIdc === 118 || profileIdc === 128) {
        chromaFormatIdc = readExpGolomb(bitstream);
        if (chromaFormatIdc === 3) {
          separateColourPlaneFlag = bitstream.readBits(1);
        }
        bitDepthLumaMinus8 = readExpGolomb(bitstream);
        bitDepthChromaMinus8 = readExpGolomb(bitstream);
        bitstream.skipBits(1);
        const seqScalingMatrixPresentFlag = bitstream.readBits(1);
        if (seqScalingMatrixPresentFlag) {
          for (let i3 = 0; i3 < (chromaFormatIdc !== 3 ? 8 : 12); i3++) {
            const seqScalingListPresentFlag = bitstream.readBits(1);
            if (seqScalingListPresentFlag) {
              const sizeOfScalingList = i3 < 6 ? 16 : 64;
              let lastScale = 8;
              let nextScale = 8;
              for (let j3 = 0; j3 < sizeOfScalingList; j3++) {
                if (nextScale !== 0) {
                  const deltaScale = readSignedExpGolomb(bitstream);
                  nextScale = (lastScale + deltaScale + 256) % 256;
                }
                lastScale = nextScale === 0 ? lastScale : nextScale;
              }
            }
          }
        }
      }
      readExpGolomb(bitstream);
      const picOrderCntType = readExpGolomb(bitstream);
      if (picOrderCntType === 0) {
        readExpGolomb(bitstream);
      } else if (picOrderCntType === 1) {
        bitstream.skipBits(1);
        readSignedExpGolomb(bitstream);
        readSignedExpGolomb(bitstream);
        const numRefFramesInPicOrderCntCycle = readExpGolomb(bitstream);
        for (let i3 = 0; i3 < numRefFramesInPicOrderCntCycle; i3++) {
          readSignedExpGolomb(bitstream);
        }
      }
      readExpGolomb(bitstream);
      bitstream.skipBits(1);
      const picWidthInMbsMinus1 = readExpGolomb(bitstream);
      const picHeightInMapUnitsMinus1 = readExpGolomb(bitstream);
      const codedWidth = 16 * (picWidthInMbsMinus1 + 1);
      const codedHeight = 16 * (picHeightInMapUnitsMinus1 + 1);
      let displayWidth = codedWidth;
      let displayHeight = codedHeight;
      const frameMbsOnlyFlag = bitstream.readBits(1);
      if (!frameMbsOnlyFlag) {
        bitstream.skipBits(1);
      }
      bitstream.skipBits(1);
      const frameCroppingFlag = bitstream.readBits(1);
      if (frameCroppingFlag) {
        const frameCropLeftOffset = readExpGolomb(bitstream);
        const frameCropRightOffset = readExpGolomb(bitstream);
        const frameCropTopOffset = readExpGolomb(bitstream);
        const frameCropBottomOffset = readExpGolomb(bitstream);
        let cropUnitX;
        let cropUnitY;
        const chromaArrayType = separateColourPlaneFlag === 0 ? chromaFormatIdc : 0;
        if (chromaArrayType === 0) {
          cropUnitX = 1;
          cropUnitY = 2 - frameMbsOnlyFlag;
        } else {
          const subWidthC = chromaFormatIdc === 3 ? 1 : 2;
          const subHeightC = chromaFormatIdc === 1 ? 2 : 1;
          cropUnitX = subWidthC;
          cropUnitY = subHeightC * (2 - frameMbsOnlyFlag);
        }
        displayWidth -= cropUnitX * (frameCropLeftOffset + frameCropRightOffset);
        displayHeight -= cropUnitY * (frameCropTopOffset + frameCropBottomOffset);
      }
      let colourPrimaries = 2;
      let transferCharacteristics = 2;
      let matrixCoefficients = 2;
      let fullRangeFlag = 0;
      let pixelAspectRatio = { num: 1, den: 1 };
      let numReorderFrames = null;
      let maxDecFrameBuffering = null;
      let bitstreamRestrictionFlagBitOffset = null;
      let bitstreamRestrictionFlag = null;
      const vuiParametersFlagBitOffset = bitstream.pos;
      const vuiParametersPresentFlag = bitstream.readBits(1);
      if (vuiParametersPresentFlag) {
        const aspectRatioInfoPresentFlag = bitstream.readBits(1);
        if (aspectRatioInfoPresentFlag) {
          const aspectRatioIdc = bitstream.readBits(8);
          if (aspectRatioIdc === 255) {
            pixelAspectRatio = {
              num: bitstream.readBits(16),
              den: bitstream.readBits(16)
            };
          } else {
            const aspectRatio = AVC_HEVC_ASPECT_RATIO_IDC_TABLE[aspectRatioIdc];
            if (aspectRatio) {
              pixelAspectRatio = aspectRatio;
            }
          }
        }
        const overscanInfoPresentFlag = bitstream.readBits(1);
        if (overscanInfoPresentFlag) {
          bitstream.skipBits(1);
        }
        const videoSignalTypePresentFlag = bitstream.readBits(1);
        if (videoSignalTypePresentFlag) {
          bitstream.skipBits(3);
          fullRangeFlag = bitstream.readBits(1);
          const colourDescriptionPresentFlag = bitstream.readBits(1);
          if (colourDescriptionPresentFlag) {
            colourPrimaries = bitstream.readBits(8);
            transferCharacteristics = bitstream.readBits(8);
            matrixCoefficients = bitstream.readBits(8);
          }
        }
        const chromaLocInfoPresentFlag = bitstream.readBits(1);
        if (chromaLocInfoPresentFlag) {
          readExpGolomb(bitstream);
          readExpGolomb(bitstream);
        }
        const timingInfoPresentFlag = bitstream.readBits(1);
        if (timingInfoPresentFlag) {
          bitstream.skipBits(32);
          bitstream.skipBits(32);
          bitstream.skipBits(1);
        }
        const nalHrdParametersPresentFlag = bitstream.readBits(1);
        if (nalHrdParametersPresentFlag) {
          skipAvcHrdParameters(bitstream);
        }
        const vclHrdParametersPresentFlag = bitstream.readBits(1);
        if (vclHrdParametersPresentFlag) {
          skipAvcHrdParameters(bitstream);
        }
        if (nalHrdParametersPresentFlag || vclHrdParametersPresentFlag) {
          bitstream.skipBits(1);
        }
        bitstream.skipBits(1);
        bitstreamRestrictionFlagBitOffset = bitstream.pos;
        bitstreamRestrictionFlag = bitstream.readBits(1);
        if (bitstreamRestrictionFlag) {
          bitstream.skipBits(1);
          readExpGolomb(bitstream);
          readExpGolomb(bitstream);
          readExpGolomb(bitstream);
          readExpGolomb(bitstream);
          numReorderFrames = readExpGolomb(bitstream);
          maxDecFrameBuffering = readExpGolomb(bitstream);
        }
      }
      if (numReorderFrames === null) {
        assert(maxDecFrameBuffering === null);
        const constraintSet3Flag = constraintFlags & 16;
        if ((profileIdc === 44 || profileIdc === 86 || profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244) && constraintSet3Flag) {
          numReorderFrames = 0;
          maxDecFrameBuffering = 0;
        } else {
          const picWidthInMbs = picWidthInMbsMinus1 + 1;
          const picHeightInMapUnits = picHeightInMapUnitsMinus1 + 1;
          const frameHeightInMbs = (2 - frameMbsOnlyFlag) * picHeightInMapUnits;
          const levelInfo = AVC_LEVEL_TABLE.find((x2) => x2.level >= levelIdc) ?? last(AVC_LEVEL_TABLE);
          const maxDpbFrames = Math.min(Math.floor(levelInfo.maxDpbMbs / (picWidthInMbs * frameHeightInMbs)), 16);
          numReorderFrames = maxDpbFrames;
          maxDecFrameBuffering = maxDpbFrames;
        }
      }
      assert(maxDecFrameBuffering !== null);
      return {
        emulationUnpreventedBytes,
        profileIdc,
        constraintFlags,
        levelIdc,
        frameMbsOnlyFlag,
        chromaFormatIdc,
        bitDepthLumaMinus8,
        bitDepthChromaMinus8,
        codedWidth,
        codedHeight,
        displayWidth,
        displayHeight,
        pixelAspectRatio,
        colourPrimaries,
        matrixCoefficients,
        transferCharacteristics,
        fullRangeFlag,
        numReorderFrames,
        maxDecFrameBuffering,
        vuiParametersFlagBitOffset,
        bitstreamRestrictionFlagBitOffset,
        bitstreamRestrictionFlag
      };
    } catch (error) {
      Logging._error("Error parsing AVC SPS:", error);
      return null;
    }
  };
  var skipAvcHrdParameters = (bitstream) => {
    const cpb_cnt_minus1 = readExpGolomb(bitstream);
    bitstream.skipBits(4);
    bitstream.skipBits(4);
    for (let i3 = 0; i3 <= cpb_cnt_minus1; i3++) {
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      bitstream.skipBits(1);
    }
    bitstream.skipBits(5);
    bitstream.skipBits(5);
    bitstream.skipBits(5);
    bitstream.skipBits(5);
  };
  var addAvcBitstreamRestriction = (sps) => {
    assert(sps.bitstreamRestrictionFlag !== 1);
    const modifiedBytes = new Uint8Array(sps.emulationUnpreventedBytes.byteLength + 64);
    const oldBitstream = new Bitstream(sps.emulationUnpreventedBytes);
    const newBitstream = new Bitstream(modifiedBytes);
    if (sps.bitstreamRestrictionFlag === null) {
      newBitstream.copyBits(sps.vuiParametersFlagBitOffset, oldBitstream);
      newBitstream.writeBits(1, 1);
      newBitstream.writeBits(1, 0);
      newBitstream.writeBits(1, 0);
      newBitstream.writeBits(1, 0);
      newBitstream.writeBits(1, 0);
      newBitstream.writeBits(1, 0);
      newBitstream.writeBits(1, 0);
      newBitstream.writeBits(1, 0);
      newBitstream.writeBits(1, 0);
    } else {
      assert(sps.bitstreamRestrictionFlagBitOffset !== null);
      newBitstream.copyBits(sps.bitstreamRestrictionFlagBitOffset, oldBitstream);
    }
    newBitstream.writeBits(1, 1);
    newBitstream.writeBits(1, 1);
    writeExpGolomb(newBitstream, 2);
    writeExpGolomb(newBitstream, 1);
    writeExpGolomb(newBitstream, 16);
    writeExpGolomb(newBitstream, 16);
    writeExpGolomb(newBitstream, sps.numReorderFrames);
    writeExpGolomb(newBitstream, sps.maxDecFrameBuffering);
    newBitstream.writeBits(1, 1);
    newBitstream.writeBits((8 - newBitstream.pos % 8) % 8, 0);
    const byteLength = newBitstream.pos / 8;
    assert(Number.isInteger(byteLength));
    return addEmulationPreventionBytes(modifiedBytes.subarray(0, byteLength));
  };
  var concatHevcNalUnits = (nalUnits, decoderConfig) => {
    if (decoderConfig.description) {
      const bytes = toUint8Array(decoderConfig.description);
      const lengthSizeMinusOne = bytes[21] & 3;
      const lengthSize = lengthSizeMinusOne + 1;
      return concatNalUnitsInLengthPrefixed(nalUnits, lengthSize);
    } else {
      return concatNalUnitsInAnnexB(nalUnits);
    }
  };
  var iterateHevcNalUnits = (packetData, decoderConfig) => {
    if (decoderConfig.description) {
      const bytes = toUint8Array(decoderConfig.description);
      const lengthSizeMinusOne = bytes[21] & 3;
      const lengthSize = lengthSizeMinusOne + 1;
      return iterateNalUnitsInLengthPrefixed(packetData, lengthSize);
    } else {
      return iterateNalUnitsInAnnexB(packetData);
    }
  };
  var extractNalUnitTypeForHevc = (byte) => {
    return byte >> 1 & 63;
  };
  var parseHevcSps = (sps) => {
    try {
      const bitstream = new Bitstream(removeEmulationPreventionBytes(sps));
      bitstream.skipBits(16);
      bitstream.readBits(4);
      const spsMaxSubLayersMinus1 = bitstream.readBits(3);
      const spsTemporalIdNestingFlag = bitstream.readBits(1);
      const { general_profile_space, general_tier_flag, general_profile_idc, general_profile_compatibility_flags, general_constraint_indicator_flags, general_level_idc } = parseProfileTierLevel(bitstream, spsMaxSubLayersMinus1);
      readExpGolomb(bitstream);
      const chromaFormatIdc = readExpGolomb(bitstream);
      let separateColourPlaneFlag = 0;
      if (chromaFormatIdc === 3) {
        separateColourPlaneFlag = bitstream.readBits(1);
      }
      const picWidthInLumaSamples = readExpGolomb(bitstream);
      const picHeightInLumaSamples = readExpGolomb(bitstream);
      let displayWidth = picWidthInLumaSamples;
      let displayHeight = picHeightInLumaSamples;
      if (bitstream.readBits(1)) {
        const confWinLeftOffset = readExpGolomb(bitstream);
        const confWinRightOffset = readExpGolomb(bitstream);
        const confWinTopOffset = readExpGolomb(bitstream);
        const confWinBottomOffset = readExpGolomb(bitstream);
        let subWidthC = 1;
        let subHeightC = 1;
        const chromaArrayType = separateColourPlaneFlag === 0 ? chromaFormatIdc : 0;
        if (chromaArrayType === 1) {
          subWidthC = 2;
          subHeightC = 2;
        } else if (chromaArrayType === 2) {
          subWidthC = 2;
          subHeightC = 1;
        }
        displayWidth -= (confWinLeftOffset + confWinRightOffset) * subWidthC;
        displayHeight -= (confWinTopOffset + confWinBottomOffset) * subHeightC;
      }
      const bitDepthLumaMinus8 = readExpGolomb(bitstream);
      const bitDepthChromaMinus8 = readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      const spsSubLayerOrderingInfoPresentFlag = bitstream.readBits(1);
      const startI = spsSubLayerOrderingInfoPresentFlag ? 0 : spsMaxSubLayersMinus1;
      let spsMaxNumReorderPics = 0;
      for (let i3 = startI; i3 <= spsMaxSubLayersMinus1; i3++) {
        readExpGolomb(bitstream);
        spsMaxNumReorderPics = readExpGolomb(bitstream);
        readExpGolomb(bitstream);
      }
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      if (bitstream.readBits(1)) {
        if (bitstream.readBits(1)) {
          skipScalingListData(bitstream);
        }
      }
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      if (bitstream.readBits(1)) {
        bitstream.skipBits(4);
        bitstream.skipBits(4);
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
        bitstream.skipBits(1);
      }
      const numShortTermRefPicSets = readExpGolomb(bitstream);
      skipAllStRefPicSets(bitstream, numShortTermRefPicSets);
      if (bitstream.readBits(1)) {
        const numLongTermRefPicsSps = readExpGolomb(bitstream);
        for (let i3 = 0; i3 < numLongTermRefPicsSps; i3++) {
          readExpGolomb(bitstream);
          bitstream.skipBits(1);
        }
      }
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      let colourPrimaries = 2;
      let transferCharacteristics = 2;
      let matrixCoefficients = 2;
      let fullRangeFlag = 0;
      let minSpatialSegmentationIdc = 0;
      let pixelAspectRatio = { num: 1, den: 1 };
      if (bitstream.readBits(1)) {
        const vui = parseHevcVui(bitstream, spsMaxSubLayersMinus1);
        pixelAspectRatio = vui.pixelAspectRatio;
        colourPrimaries = vui.colourPrimaries;
        transferCharacteristics = vui.transferCharacteristics;
        matrixCoefficients = vui.matrixCoefficients;
        fullRangeFlag = vui.fullRangeFlag;
        minSpatialSegmentationIdc = vui.minSpatialSegmentationIdc;
      }
      return {
        displayWidth,
        displayHeight,
        pixelAspectRatio,
        colourPrimaries,
        transferCharacteristics,
        matrixCoefficients,
        fullRangeFlag,
        maxDecFrameBuffering: spsMaxNumReorderPics + 1,
        spsMaxSubLayersMinus1,
        spsTemporalIdNestingFlag,
        generalProfileSpace: general_profile_space,
        generalTierFlag: general_tier_flag,
        generalProfileIdc: general_profile_idc,
        generalProfileCompatibilityFlags: general_profile_compatibility_flags,
        generalConstraintIndicatorFlags: general_constraint_indicator_flags,
        generalLevelIdc: general_level_idc,
        chromaFormatIdc,
        bitDepthLumaMinus8,
        bitDepthChromaMinus8,
        minSpatialSegmentationIdc
      };
    } catch (error) {
      Logging._error("Error parsing HEVC SPS:", error);
      return null;
    }
  };
  var extractHevcDecoderConfigurationRecord = (packetData) => {
    try {
      const vpsUnits = [];
      const spsUnits = [];
      const ppsUnits = [];
      const seiUnits = [];
      for (const loc of iterateNalUnitsInAnnexB(packetData)) {
        const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
        const type = extractNalUnitTypeForHevc(nalUnit[0]);
        if (type === HevcNalUnitType.VPS_NUT) {
          vpsUnits.push(nalUnit);
        } else if (type === HevcNalUnitType.SPS_NUT) {
          spsUnits.push(nalUnit);
        } else if (type === HevcNalUnitType.PPS_NUT) {
          ppsUnits.push(nalUnit);
        } else if (type === HevcNalUnitType.PREFIX_SEI_NUT || type === HevcNalUnitType.SUFFIX_SEI_NUT) {
          seiUnits.push(nalUnit);
        }
      }
      if (spsUnits.length === 0 || ppsUnits.length === 0)
        return null;
      const spsInfo = parseHevcSps(spsUnits[0]);
      if (!spsInfo)
        return null;
      let parallelismType = 0;
      if (ppsUnits.length > 0) {
        const pps = ppsUnits[0];
        const ppsBitstream = new Bitstream(removeEmulationPreventionBytes(pps));
        ppsBitstream.skipBits(16);
        readExpGolomb(ppsBitstream);
        readExpGolomb(ppsBitstream);
        ppsBitstream.skipBits(1);
        ppsBitstream.skipBits(1);
        ppsBitstream.skipBits(3);
        ppsBitstream.skipBits(1);
        ppsBitstream.skipBits(1);
        readExpGolomb(ppsBitstream);
        readExpGolomb(ppsBitstream);
        readSignedExpGolomb(ppsBitstream);
        ppsBitstream.skipBits(1);
        ppsBitstream.skipBits(1);
        if (ppsBitstream.readBits(1)) {
          readExpGolomb(ppsBitstream);
        }
        readSignedExpGolomb(ppsBitstream);
        readSignedExpGolomb(ppsBitstream);
        ppsBitstream.skipBits(1);
        ppsBitstream.skipBits(1);
        ppsBitstream.skipBits(1);
        ppsBitstream.skipBits(1);
        const tiles_enabled_flag = ppsBitstream.readBits(1);
        const entropy_coding_sync_enabled_flag = ppsBitstream.readBits(1);
        if (!tiles_enabled_flag && !entropy_coding_sync_enabled_flag)
          parallelismType = 0;
        else if (tiles_enabled_flag && !entropy_coding_sync_enabled_flag)
          parallelismType = 2;
        else if (!tiles_enabled_flag && entropy_coding_sync_enabled_flag)
          parallelismType = 3;
        else
          parallelismType = 0;
      }
      const arrays = [
        ...vpsUnits.length ? [
          {
            arrayCompleteness: 1,
            nalUnitType: HevcNalUnitType.VPS_NUT,
            nalUnits: vpsUnits
          }
        ] : [],
        ...spsUnits.length ? [
          {
            arrayCompleteness: 1,
            nalUnitType: HevcNalUnitType.SPS_NUT,
            nalUnits: spsUnits
          }
        ] : [],
        ...ppsUnits.length ? [
          {
            arrayCompleteness: 1,
            nalUnitType: HevcNalUnitType.PPS_NUT,
            nalUnits: ppsUnits
          }
        ] : [],
        ...seiUnits.length ? [
          {
            arrayCompleteness: 1,
            nalUnitType: extractNalUnitTypeForHevc(seiUnits[0][0]),
            nalUnits: seiUnits
          }
        ] : []
      ];
      const record = {
        configurationVersion: 1,
        generalProfileSpace: spsInfo.generalProfileSpace,
        generalTierFlag: spsInfo.generalTierFlag,
        generalProfileIdc: spsInfo.generalProfileIdc,
        generalProfileCompatibilityFlags: spsInfo.generalProfileCompatibilityFlags,
        generalConstraintIndicatorFlags: spsInfo.generalConstraintIndicatorFlags,
        generalLevelIdc: spsInfo.generalLevelIdc,
        minSpatialSegmentationIdc: spsInfo.minSpatialSegmentationIdc,
        parallelismType,
        chromaFormatIdc: spsInfo.chromaFormatIdc,
        bitDepthLumaMinus8: spsInfo.bitDepthLumaMinus8,
        bitDepthChromaMinus8: spsInfo.bitDepthChromaMinus8,
        avgFrameRate: 0,
        constantFrameRate: 0,
        numTemporalLayers: spsInfo.spsMaxSubLayersMinus1 + 1,
        temporalIdNested: spsInfo.spsTemporalIdNestingFlag,
        lengthSizeMinusOne: 3,
        arrays
      };
      return record;
    } catch (error) {
      Logging._error("Error building HEVC Decoder Configuration Record:", error);
      return null;
    }
  };
  var parseProfileTierLevel = (bitstream, maxNumSubLayersMinus1) => {
    const general_profile_space = bitstream.readBits(2);
    const general_tier_flag = bitstream.readBits(1);
    const general_profile_idc = bitstream.readBits(5);
    let general_profile_compatibility_flags = 0;
    for (let i3 = 0; i3 < 32; i3++) {
      general_profile_compatibility_flags = general_profile_compatibility_flags << 1 | bitstream.readBits(1);
    }
    const general_constraint_indicator_flags = new Uint8Array(6);
    for (let i3 = 0; i3 < 6; i3++) {
      general_constraint_indicator_flags[i3] = bitstream.readBits(8);
    }
    const general_level_idc = bitstream.readBits(8);
    const sub_layer_profile_present_flag = [];
    const sub_layer_level_present_flag = [];
    for (let i3 = 0; i3 < maxNumSubLayersMinus1; i3++) {
      sub_layer_profile_present_flag.push(bitstream.readBits(1));
      sub_layer_level_present_flag.push(bitstream.readBits(1));
    }
    if (maxNumSubLayersMinus1 > 0) {
      for (let i3 = maxNumSubLayersMinus1; i3 < 8; i3++) {
        bitstream.skipBits(2);
      }
    }
    for (let i3 = 0; i3 < maxNumSubLayersMinus1; i3++) {
      if (sub_layer_profile_present_flag[i3])
        bitstream.skipBits(88);
      if (sub_layer_level_present_flag[i3])
        bitstream.skipBits(8);
    }
    return {
      general_profile_space,
      general_tier_flag,
      general_profile_idc,
      general_profile_compatibility_flags,
      general_constraint_indicator_flags,
      general_level_idc
    };
  };
  var skipScalingListData = (bitstream) => {
    for (let sizeId = 0; sizeId < 4; sizeId++) {
      for (let matrixId = 0; matrixId < (sizeId === 3 ? 2 : 6); matrixId++) {
        const scaling_list_pred_mode_flag = bitstream.readBits(1);
        if (!scaling_list_pred_mode_flag) {
          readExpGolomb(bitstream);
        } else {
          const coefNum = Math.min(64, 1 << 4 + (sizeId << 1));
          if (sizeId > 1) {
            readSignedExpGolomb(bitstream);
          }
          for (let i3 = 0; i3 < coefNum; i3++) {
            readSignedExpGolomb(bitstream);
          }
        }
      }
    }
  };
  var skipAllStRefPicSets = (bitstream, num_short_term_ref_pic_sets) => {
    const NumDeltaPocs = [];
    for (let stRpsIdx = 0; stRpsIdx < num_short_term_ref_pic_sets; stRpsIdx++) {
      NumDeltaPocs[stRpsIdx] = skipStRefPicSet(bitstream, stRpsIdx, num_short_term_ref_pic_sets, NumDeltaPocs);
    }
  };
  var skipStRefPicSet = (bitstream, stRpsIdx, num_short_term_ref_pic_sets, NumDeltaPocs) => {
    let NumDeltaPocsThis = 0;
    let inter_ref_pic_set_prediction_flag = 0;
    let RefRpsIdx = 0;
    if (stRpsIdx !== 0) {
      inter_ref_pic_set_prediction_flag = bitstream.readBits(1);
    }
    if (inter_ref_pic_set_prediction_flag) {
      if (stRpsIdx === num_short_term_ref_pic_sets) {
        const delta_idx_minus1 = readExpGolomb(bitstream);
        RefRpsIdx = stRpsIdx - (delta_idx_minus1 + 1);
      } else {
        RefRpsIdx = stRpsIdx - 1;
      }
      bitstream.readBits(1);
      readExpGolomb(bitstream);
      const numDelta = NumDeltaPocs[RefRpsIdx] ?? 0;
      for (let j3 = 0; j3 <= numDelta; j3++) {
        const used_by_curr_pic_flag = bitstream.readBits(1);
        if (!used_by_curr_pic_flag) {
          bitstream.readBits(1);
        }
      }
      NumDeltaPocsThis = NumDeltaPocs[RefRpsIdx];
    } else {
      const num_negative_pics = readExpGolomb(bitstream);
      const num_positive_pics = readExpGolomb(bitstream);
      for (let i3 = 0; i3 < num_negative_pics; i3++) {
        readExpGolomb(bitstream);
        bitstream.readBits(1);
      }
      for (let i3 = 0; i3 < num_positive_pics; i3++) {
        readExpGolomb(bitstream);
        bitstream.readBits(1);
      }
      NumDeltaPocsThis = num_negative_pics + num_positive_pics;
    }
    return NumDeltaPocsThis;
  };
  var parseHevcVui = (bitstream, sps_max_sub_layers_minus1) => {
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    let fullRangeFlag = 0;
    let minSpatialSegmentationIdc = 0;
    let pixelAspectRatio = { num: 1, den: 1 };
    if (bitstream.readBits(1)) {
      const aspect_ratio_idc = bitstream.readBits(8);
      if (aspect_ratio_idc === 255) {
        pixelAspectRatio = {
          num: bitstream.readBits(16),
          den: bitstream.readBits(16)
        };
      } else {
        const aspectRatio = AVC_HEVC_ASPECT_RATIO_IDC_TABLE[aspect_ratio_idc];
        if (aspectRatio) {
          pixelAspectRatio = aspectRatio;
        }
      }
    }
    if (bitstream.readBits(1)) {
      bitstream.readBits(1);
    }
    if (bitstream.readBits(1)) {
      bitstream.readBits(3);
      fullRangeFlag = bitstream.readBits(1);
      if (bitstream.readBits(1)) {
        colourPrimaries = bitstream.readBits(8);
        transferCharacteristics = bitstream.readBits(8);
        matrixCoefficients = bitstream.readBits(8);
      }
    }
    if (bitstream.readBits(1)) {
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
    }
    bitstream.readBits(1);
    bitstream.readBits(1);
    bitstream.readBits(1);
    if (bitstream.readBits(1)) {
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
    }
    if (bitstream.readBits(1)) {
      bitstream.readBits(32);
      bitstream.readBits(32);
      if (bitstream.readBits(1)) {
        readExpGolomb(bitstream);
      }
      if (bitstream.readBits(1)) {
        skipHevcHrdParameters(bitstream, true, sps_max_sub_layers_minus1);
      }
    }
    if (bitstream.readBits(1)) {
      bitstream.readBits(1);
      bitstream.readBits(1);
      bitstream.readBits(1);
      minSpatialSegmentationIdc = readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
    }
    return {
      pixelAspectRatio,
      colourPrimaries,
      transferCharacteristics,
      matrixCoefficients,
      fullRangeFlag,
      minSpatialSegmentationIdc
    };
  };
  var skipHevcHrdParameters = (bitstream, commonInfPresentFlag, maxNumSubLayersMinus1) => {
    let nal_hrd_parameters_present_flag = false;
    let vcl_hrd_parameters_present_flag = false;
    let sub_pic_hrd_params_present_flag = false;
    if (commonInfPresentFlag) {
      nal_hrd_parameters_present_flag = bitstream.readBits(1) === 1;
      vcl_hrd_parameters_present_flag = bitstream.readBits(1) === 1;
      if (nal_hrd_parameters_present_flag || vcl_hrd_parameters_present_flag) {
        sub_pic_hrd_params_present_flag = bitstream.readBits(1) === 1;
        if (sub_pic_hrd_params_present_flag) {
          bitstream.readBits(8);
          bitstream.readBits(5);
          bitstream.readBits(1);
          bitstream.readBits(5);
        }
        bitstream.readBits(4);
        bitstream.readBits(4);
        if (sub_pic_hrd_params_present_flag) {
          bitstream.readBits(4);
        }
        bitstream.readBits(5);
        bitstream.readBits(5);
        bitstream.readBits(5);
      }
    }
    for (let i3 = 0; i3 <= maxNumSubLayersMinus1; i3++) {
      const fixed_pic_rate_general_flag = bitstream.readBits(1) === 1;
      let fixed_pic_rate_within_cvs_flag = true;
      if (!fixed_pic_rate_general_flag) {
        fixed_pic_rate_within_cvs_flag = bitstream.readBits(1) === 1;
      }
      let low_delay_hrd_flag = false;
      if (fixed_pic_rate_within_cvs_flag) {
        readExpGolomb(bitstream);
      } else {
        low_delay_hrd_flag = bitstream.readBits(1) === 1;
      }
      let CpbCnt = 1;
      if (!low_delay_hrd_flag) {
        const cpb_cnt_minus1 = readExpGolomb(bitstream);
        CpbCnt = cpb_cnt_minus1 + 1;
      }
      if (nal_hrd_parameters_present_flag) {
        skipSubLayerHrdParameters(bitstream, CpbCnt, sub_pic_hrd_params_present_flag);
      }
      if (vcl_hrd_parameters_present_flag) {
        skipSubLayerHrdParameters(bitstream, CpbCnt, sub_pic_hrd_params_present_flag);
      }
    }
  };
  var skipSubLayerHrdParameters = (bitstream, CpbCnt, sub_pic_hrd_params_present_flag) => {
    for (let i3 = 0; i3 < CpbCnt; i3++) {
      readExpGolomb(bitstream);
      readExpGolomb(bitstream);
      if (sub_pic_hrd_params_present_flag) {
        readExpGolomb(bitstream);
        readExpGolomb(bitstream);
      }
      bitstream.readBits(1);
    }
  };
  var deserializeHevcDecoderConfigurationRecord = (data) => {
    try {
      const view = toDataView(data);
      let offset = 0;
      const configurationVersion = view.getUint8(offset++);
      const byte1 = view.getUint8(offset++);
      const generalProfileSpace = byte1 >> 6 & 3;
      const generalTierFlag = byte1 >> 5 & 1;
      const generalProfileIdc = byte1 & 31;
      const generalProfileCompatibilityFlags = view.getUint32(offset, false);
      offset += 4;
      const generalConstraintIndicatorFlags = data.subarray(offset, offset + 6);
      offset += 6;
      const generalLevelIdc = view.getUint8(offset++);
      const minSpatialSegmentationIdc = (view.getUint8(offset++) & 15) << 8 | view.getUint8(offset++);
      const parallelismType = view.getUint8(offset++) & 3;
      const chromaFormatIdc = view.getUint8(offset++) & 3;
      const bitDepthLumaMinus8 = view.getUint8(offset++) & 7;
      const bitDepthChromaMinus8 = view.getUint8(offset++) & 7;
      const avgFrameRate = view.getUint16(offset, false);
      offset += 2;
      const byte21 = view.getUint8(offset++);
      const constantFrameRate = byte21 >> 6 & 3;
      const numTemporalLayers = byte21 >> 3 & 7;
      const temporalIdNested = byte21 >> 2 & 1;
      const lengthSizeMinusOne = byte21 & 3;
      const numOfArrays = view.getUint8(offset++);
      const arrays = [];
      for (let i3 = 0; i3 < numOfArrays; i3++) {
        const arrByte = view.getUint8(offset++);
        const arrayCompleteness = arrByte >> 7 & 1;
        const nalUnitType = arrByte & 63;
        const numNalus = view.getUint16(offset, false);
        offset += 2;
        const nalUnits = [];
        for (let j3 = 0; j3 < numNalus; j3++) {
          const nalUnitLength = view.getUint16(offset, false);
          offset += 2;
          nalUnits.push(data.subarray(offset, offset + nalUnitLength));
          offset += nalUnitLength;
        }
        arrays.push({
          arrayCompleteness,
          nalUnitType,
          nalUnits
        });
      }
      return {
        configurationVersion,
        generalProfileSpace,
        generalTierFlag,
        generalProfileIdc,
        generalProfileCompatibilityFlags,
        generalConstraintIndicatorFlags,
        generalLevelIdc,
        minSpatialSegmentationIdc,
        parallelismType,
        chromaFormatIdc,
        bitDepthLumaMinus8,
        bitDepthChromaMinus8,
        avgFrameRate,
        constantFrameRate,
        numTemporalLayers,
        temporalIdNested,
        lengthSizeMinusOne,
        arrays
      };
    } catch (error) {
      Logging._error("Error deserializing HEVC Decoder Configuration Record:", error);
      return null;
    }
  };
  var HevcNaluOrderState;
  (function(HevcNaluOrderState2) {
    HevcNaluOrderState2[HevcNaluOrderState2["audAllowed"] = 0] = "audAllowed";
    HevcNaluOrderState2[HevcNaluOrderState2["beforeFirstVcl"] = 1] = "beforeFirstVcl";
    HevcNaluOrderState2[HevcNaluOrderState2["afterFirstVcl"] = 2] = "afterFirstVcl";
    HevcNaluOrderState2[HevcNaluOrderState2["eoBitstreamAllowed"] = 3] = "eoBitstreamAllowed";
    HevcNaluOrderState2[HevcNaluOrderState2["noMoreDataAllowed"] = 4] = "noMoreDataAllowed";
  })(HevcNaluOrderState || (HevcNaluOrderState = {}));
  var sanitizeHevcPacketForChromium = (packetData, decoderConfig) => {
    const removedNalUnits = /* @__PURE__ */ new Set();
    let orderState = HevcNaluOrderState.audAllowed;
    for (const loc of iterateHevcNalUnits(packetData, decoderConfig)) {
      if (orderState === HevcNaluOrderState.noMoreDataAllowed) {
        removedNalUnits.add(loc.offset);
        continue;
      }
      const type = extractNalUnitTypeForHevc(packetData[loc.offset]);
      if (orderState === HevcNaluOrderState.eoBitstreamAllowed && type !== 37) {
        removedNalUnits.add(loc.offset);
        continue;
      }
      let remove = false;
      if (type === 35) {
        if (orderState > HevcNaluOrderState.audAllowed) {
          remove = true;
        } else {
          orderState = HevcNaluOrderState.beforeFirstVcl;
        }
      } else if (type <= 31) {
        if (orderState > HevcNaluOrderState.afterFirstVcl) {
          remove = true;
        } else {
          orderState = HevcNaluOrderState.afterFirstVcl;
        }
      } else if (type === 36) {
        if (orderState !== HevcNaluOrderState.afterFirstVcl) {
          remove = true;
        } else {
          orderState = HevcNaluOrderState.eoBitstreamAllowed;
        }
      } else if (type === 37) {
        if (orderState < HevcNaluOrderState.afterFirstVcl) {
          remove = true;
        } else {
          orderState = HevcNaluOrderState.noMoreDataAllowed;
        }
      } else if (type === 32 || type === 33 || type === 34 || type === 39 || type >= 41 && type <= 44 || type >= 48 && type <= 55) {
        if (orderState > HevcNaluOrderState.beforeFirstVcl) {
          remove = true;
        } else {
          orderState = HevcNaluOrderState.beforeFirstVcl;
        }
      } else if (type === 38 || type === 40 || type >= 45 && type <= 47 || type >= 56 && type <= 63) {
        if (orderState < HevcNaluOrderState.afterFirstVcl) {
          remove = true;
        }
      }
      if (remove) {
        removedNalUnits.add(loc.offset);
      }
    }
    if (removedNalUnits.size === 0) {
      return null;
    }
    const filteredNalUnits = [];
    for (const loc of iterateHevcNalUnits(packetData, decoderConfig)) {
      if (!removedNalUnits.has(loc.offset)) {
        filteredNalUnits.push(packetData.subarray(loc.offset, loc.offset + loc.length));
      }
    }
    return concatHevcNalUnits(filteredNalUnits, decoderConfig);
  };
  var VP9_COLOR_SPACE_TABLE = {
    1: { colourPrimaries: 5, transferCharacteristics: 6, matrixCoefficients: 5 },
    // CS_BT_601
    2: { colourPrimaries: 1, transferCharacteristics: 1, matrixCoefficients: 1 },
    // CS_BT_709
    3: { colourPrimaries: 6, transferCharacteristics: 6, matrixCoefficients: 6 },
    // CS_SMPTE_170
    4: { colourPrimaries: 7, transferCharacteristics: 7, matrixCoefficients: 7 },
    // CS_SMPTE_240
    5: { colourPrimaries: 9, transferCharacteristics: 14, matrixCoefficients: 9 },
    // CS_BT_2020
    7: { colourPrimaries: 1, transferCharacteristics: 13, matrixCoefficients: 0 }
    // CS_RGB (sRGB)
  };
  var extractVp9CodecInfoFromPacket = (packet) => {
    const bitstream = new Bitstream(packet);
    const frameMarker = bitstream.readBits(2);
    if (frameMarker !== 2) {
      return null;
    }
    const profileLowBit = bitstream.readBits(1);
    const profileHighBit = bitstream.readBits(1);
    const profile = (profileHighBit << 1) + profileLowBit;
    if (profile === 3) {
      bitstream.skipBits(1);
    }
    const showExistingFrame = bitstream.readBits(1);
    if (showExistingFrame === 1) {
      return null;
    }
    const frameType = bitstream.readBits(1);
    if (frameType !== 0) {
      return null;
    }
    bitstream.skipBits(2);
    const syncCode = bitstream.readBits(24);
    if (syncCode !== 4817730) {
      return null;
    }
    let bitDepth = 8;
    if (profile >= 2) {
      const tenOrTwelveBit = bitstream.readBits(1);
      bitDepth = tenOrTwelveBit ? 12 : 10;
    }
    const colorSpace = bitstream.readBits(3);
    let chromaSubsampling = 0;
    let videoFullRangeFlag = 0;
    if (colorSpace !== 7) {
      const colorRange = bitstream.readBits(1);
      videoFullRangeFlag = colorRange;
      if (profile === 1 || profile === 3) {
        const subsamplingX = bitstream.readBits(1);
        const subsamplingY = bitstream.readBits(1);
        chromaSubsampling = !subsamplingX && !subsamplingY ? 3 : subsamplingX && !subsamplingY ? 2 : 1;
        bitstream.skipBits(1);
      } else {
        chromaSubsampling = 1;
      }
    } else {
      chromaSubsampling = 3;
      videoFullRangeFlag = 1;
    }
    const widthMinusOne = bitstream.readBits(16);
    const heightMinusOne = bitstream.readBits(16);
    const width = widthMinusOne + 1;
    const height = heightMinusOne + 1;
    const pictureSize = width * height;
    let level = last(VP9_LEVEL_TABLE).level;
    for (const entry of VP9_LEVEL_TABLE) {
      if (pictureSize <= entry.maxPictureSize) {
        level = entry.level;
        break;
      }
    }
    const colorSpaceValues = VP9_COLOR_SPACE_TABLE[colorSpace];
    const colourPrimaries = colorSpaceValues?.colourPrimaries ?? 2;
    const transferCharacteristics = colorSpaceValues?.transferCharacteristics ?? 2;
    const matrixCoefficients = colorSpaceValues?.matrixCoefficients ?? 2;
    return {
      profile,
      level,
      bitDepth,
      chromaSubsampling,
      videoFullRangeFlag,
      colourPrimaries,
      transferCharacteristics,
      matrixCoefficients
    };
  };
  var vp9CodecInfoHasColorInfo = (info) => {
    return info.colourPrimaries !== 2 || info.transferCharacteristics !== 2 || info.matrixCoefficients !== 2;
  };
  var iterateAv1PacketObus = function* (packet) {
    const bitstream = new Bitstream(packet);
    const readLeb128 = () => {
      let value = 0;
      for (let i3 = 0; i3 < 8; i3++) {
        const byte = bitstream.readAlignedByte();
        value += (byte & 127) * 2 ** (i3 * 7);
        if (!(byte & 128)) {
          break;
        }
        if (i3 === 7 && byte & 128) {
          return null;
        }
      }
      if (value > 2 ** 32 - 1) {
        return null;
      }
      return value;
    };
    while (bitstream.getBitsLeft() >= 8) {
      bitstream.skipBits(1);
      const obuType = bitstream.readBits(4);
      const obuExtension = bitstream.readBits(1);
      const obuHasSizeField = bitstream.readBits(1);
      bitstream.skipBits(1);
      if (obuExtension) {
        bitstream.skipBits(8);
      }
      let obuSize;
      if (obuHasSizeField) {
        const obuSizeValue = readLeb128();
        if (obuSizeValue === null)
          return;
        obuSize = obuSizeValue;
      } else {
        obuSize = Math.floor(bitstream.getBitsLeft() / 8);
      }
      assert(bitstream.pos % 8 === 0);
      yield {
        type: obuType,
        data: packet.subarray(bitstream.pos / 8, bitstream.pos / 8 + obuSize)
      };
      bitstream.skipBits(obuSize * 8);
    }
  };
  var extractAv1CodecInfoFromPacket = (packet) => {
    for (const { type, data } of iterateAv1PacketObus(packet)) {
      if (type !== 1) {
        continue;
      }
      const bitstream = new Bitstream(data);
      const seqProfile = bitstream.readBits(3);
      const stillPicture = bitstream.readBits(1);
      const reducedStillPictureHeader = bitstream.readBits(1);
      let seqLevel = 0;
      let seqTier = 0;
      let bufferDelayLengthMinus1 = 0;
      if (reducedStillPictureHeader) {
        seqLevel = bitstream.readBits(5);
      } else {
        const timingInfoPresentFlag = bitstream.readBits(1);
        let decoderModelInfoPresentFlag = 0;
        if (timingInfoPresentFlag) {
          bitstream.skipBits(32);
          bitstream.skipBits(32);
          const equalPictureInterval = bitstream.readBits(1);
          if (equalPictureInterval) {
            let leadingZeros = 0;
            while (leadingZeros < 32 && !bitstream.readBits(1)) {
              leadingZeros++;
            }
            if (leadingZeros < 32) {
              bitstream.skipBits(leadingZeros);
            }
          }
          decoderModelInfoPresentFlag = bitstream.readBits(1);
          if (decoderModelInfoPresentFlag) {
            bufferDelayLengthMinus1 = bitstream.readBits(5);
            bitstream.skipBits(32);
            bitstream.skipBits(5);
            bitstream.skipBits(5);
          }
        }
        const initialDisplayDelayPresentFlag = bitstream.readBits(1);
        const operatingPointsCntMinus1 = bitstream.readBits(5);
        for (let i3 = 0; i3 <= operatingPointsCntMinus1; i3++) {
          bitstream.skipBits(12);
          const seqLevelIdx = bitstream.readBits(5);
          if (i3 === 0) {
            seqLevel = seqLevelIdx;
          }
          if (seqLevelIdx > 7) {
            const seqTierTemp = bitstream.readBits(1);
            if (i3 === 0) {
              seqTier = seqTierTemp;
            }
          }
          if (decoderModelInfoPresentFlag) {
            const decoderModelPresentForThisOp = bitstream.readBits(1);
            if (decoderModelPresentForThisOp) {
              const n3 = bufferDelayLengthMinus1 + 1;
              bitstream.skipBits(n3);
              bitstream.skipBits(n3);
              bitstream.skipBits(1);
            }
          }
          if (initialDisplayDelayPresentFlag) {
            const initialDisplayDelayPresentForThisOp = bitstream.readBits(1);
            if (initialDisplayDelayPresentForThisOp) {
              bitstream.skipBits(4);
            }
          }
        }
      }
      const frameWidthBitsMinus1 = bitstream.readBits(4);
      const frameHeightBitsMinus1 = bitstream.readBits(4);
      const n1 = frameWidthBitsMinus1 + 1;
      bitstream.skipBits(n1);
      const n2 = frameHeightBitsMinus1 + 1;
      bitstream.skipBits(n2);
      let frameIdNumbersPresentFlag = 0;
      if (reducedStillPictureHeader) {
        frameIdNumbersPresentFlag = 0;
      } else {
        frameIdNumbersPresentFlag = bitstream.readBits(1);
      }
      if (frameIdNumbersPresentFlag) {
        bitstream.skipBits(4);
        bitstream.skipBits(3);
      }
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      if (!reducedStillPictureHeader) {
        bitstream.skipBits(1);
        bitstream.skipBits(1);
        bitstream.skipBits(1);
        bitstream.skipBits(1);
        const enableOrderHint = bitstream.readBits(1);
        if (enableOrderHint) {
          bitstream.skipBits(1);
          bitstream.skipBits(1);
        }
        const seqChooseScreenContentTools = bitstream.readBits(1);
        let seqForceScreenContentTools = 0;
        if (seqChooseScreenContentTools) {
          seqForceScreenContentTools = 2;
        } else {
          seqForceScreenContentTools = bitstream.readBits(1);
        }
        if (seqForceScreenContentTools > 0) {
          const seqChooseIntegerMv = bitstream.readBits(1);
          if (!seqChooseIntegerMv) {
            bitstream.skipBits(1);
          }
        }
        if (enableOrderHint) {
          bitstream.skipBits(3);
        }
      }
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      const highBitdepth = bitstream.readBits(1);
      let bitDepth = 8;
      if (seqProfile === 2 && highBitdepth) {
        const twelveBit = bitstream.readBits(1);
        bitDepth = twelveBit ? 12 : 10;
      } else if (seqProfile <= 2) {
        bitDepth = highBitdepth ? 10 : 8;
      }
      let monochrome = 0;
      if (seqProfile !== 1) {
        monochrome = bitstream.readBits(1);
      }
      let colourPrimaries = 2;
      let transferCharacteristics = 2;
      let matrixCoefficients = 2;
      const colorDescriptionPresentFlag = bitstream.readBits(1);
      if (colorDescriptionPresentFlag) {
        colourPrimaries = bitstream.readBits(8);
        transferCharacteristics = bitstream.readBits(8);
        matrixCoefficients = bitstream.readBits(8);
      }
      let videoFullRangeFlag = 0;
      let chromaSubsamplingX = 1;
      let chromaSubsamplingY = 1;
      let chromaSamplePosition = 0;
      if (monochrome) {
        videoFullRangeFlag = bitstream.readBits(1);
      } else if (colourPrimaries === 1 && transferCharacteristics === 13 && matrixCoefficients === 0) {
        videoFullRangeFlag = 1;
        chromaSubsamplingX = 0;
        chromaSubsamplingY = 0;
      } else {
        videoFullRangeFlag = bitstream.readBits(1);
        if (seqProfile === 0) {
          chromaSubsamplingX = 1;
          chromaSubsamplingY = 1;
        } else if (seqProfile === 1) {
          chromaSubsamplingX = 0;
          chromaSubsamplingY = 0;
        } else {
          if (bitDepth === 12) {
            chromaSubsamplingX = bitstream.readBits(1);
            chromaSubsamplingY = chromaSubsamplingX ? bitstream.readBits(1) : 0;
          } else {
            chromaSubsamplingX = 1;
            chromaSubsamplingY = 0;
          }
        }
        if (chromaSubsamplingX && chromaSubsamplingY) {
          chromaSamplePosition = bitstream.readBits(2);
        }
      }
      return {
        profile: seqProfile,
        level: seqLevel,
        tier: seqTier,
        bitDepth,
        monochrome,
        chromaSubsamplingX,
        chromaSubsamplingY,
        chromaSamplePosition,
        videoFullRangeFlag,
        colourPrimaries,
        transferCharacteristics,
        matrixCoefficients
      };
    }
    return null;
  };
  var av1CodecInfoHasColorInfo = (info) => {
    return info.colourPrimaries !== 2 || info.transferCharacteristics !== 2 || info.matrixCoefficients !== 2;
  };
  var extractProresCodecInfoFromPacket = (packet) => {
    const frameHeaderStart = 8;
    if (packet.length < frameHeaderStart + 28) {
      return null;
    }
    const view = toDataView(packet);
    if (view.getUint32(4) !== 1768124518) {
      return null;
    }
    const headerSize = view.getUint16(frameHeaderStart);
    if (headerSize < 28) {
      return null;
    }
    return {
      fullRange: false,
      // ProRes is always limited range
      colourPrimaries: view.getUint8(frameHeaderStart + 14),
      transferCharacteristics: view.getUint8(frameHeaderStart + 15),
      matrixCoefficients: view.getUint8(frameHeaderStart + 16)
    };
  };
  var determineVideoPacketType = (codec, decoderConfig, packetData) => {
    switch (codec) {
      case "avc":
        {
          for (const loc of iterateAvcNalUnits(packetData, decoderConfig)) {
            const nalTypeByte = packetData[loc.offset];
            const type = extractNalUnitTypeForAvc(nalTypeByte);
            if (type >= AvcNalUnitType.NON_IDR_SLICE && type <= AvcNalUnitType.SLICE_DPC) {
              return "delta";
            }
            if (type === AvcNalUnitType.IDR) {
              return "key";
            }
            if (type === AvcNalUnitType.SEI && !isChromium()) {
              const nalUnit = packetData.subarray(loc.offset, loc.offset + loc.length);
              const bytes = removeEmulationPreventionBytes(nalUnit);
              let pos = 1;
              do {
                let payloadType = 0;
                while (true) {
                  const nextByte = bytes[pos++];
                  if (nextByte === void 0)
                    break;
                  payloadType += nextByte;
                  if (nextByte < 255) {
                    break;
                  }
                }
                let payloadSize = 0;
                while (true) {
                  const nextByte = bytes[pos++];
                  if (nextByte === void 0)
                    break;
                  payloadSize += nextByte;
                  if (nextByte < 255) {
                    break;
                  }
                }
                const PAYLOAD_TYPE_RECOVERY_POINT = 6;
                if (payloadType === PAYLOAD_TYPE_RECOVERY_POINT) {
                  const bitstream = new Bitstream(bytes);
                  bitstream.pos = 8 * pos;
                  const recoveryFrameCount = readExpGolomb(bitstream);
                  const exactMatchFlag = bitstream.readBits(1);
                  if (recoveryFrameCount === 0 && exactMatchFlag === 1) {
                    return "key";
                  }
                }
                pos += payloadSize;
              } while (pos < bytes.length - 1);
            }
          }
          return "delta";
        }
        ;
      case "hevc":
        {
          for (const loc of iterateHevcNalUnits(packetData, decoderConfig)) {
            const type = extractNalUnitTypeForHevc(packetData[loc.offset]);
            if (type < HevcNalUnitType.BLA_W_LP) {
              return "delta";
            }
            if (type <= HevcNalUnitType.RSV_IRAP_VCL23) {
              return "key";
            }
          }
          return "delta";
        }
        ;
      case "vp8":
        {
          const frameType = packetData[0] & 1;
          return frameType === 0 ? "key" : "delta";
        }
        ;
      case "vp9":
        {
          const bitstream = new Bitstream(packetData);
          if (bitstream.readBits(2) !== 2) {
            return null;
          }
          ;
          const profileLowBit = bitstream.readBits(1);
          const profileHighBit = bitstream.readBits(1);
          const profile = (profileHighBit << 1) + profileLowBit;
          if (profile === 3) {
            bitstream.skipBits(1);
          }
          const showExistingFrame = bitstream.readBits(1);
          if (showExistingFrame) {
            return null;
          }
          const frameType = bitstream.readBits(1);
          return frameType === 0 ? "key" : "delta";
        }
        ;
      case "av1":
        {
          let reducedStillPictureHeader = false;
          for (const { type, data } of iterateAv1PacketObus(packetData)) {
            if (type === 1) {
              const bitstream = new Bitstream(data);
              bitstream.skipBits(4);
              reducedStillPictureHeader = !!bitstream.readBits(1);
            } else if (type === 3 || type === 6 || type === 7) {
              if (reducedStillPictureHeader) {
                return "key";
              }
              const bitstream = new Bitstream(data);
              const showExistingFrame = bitstream.readBits(1);
              if (showExistingFrame) {
                return null;
              }
              const frameType = bitstream.readBits(2);
              return frameType === 0 ? "key" : "delta";
            }
          }
          return null;
        }
        ;
      case "prores":
        {
          return "key";
        }
        ;
      default:
        {
          assertNever(codec);
          assert(false);
        }
        ;
    }
  };
  var FlacBlockType;
  (function(FlacBlockType2) {
    FlacBlockType2[FlacBlockType2["STREAMINFO"] = 0] = "STREAMINFO";
    FlacBlockType2[FlacBlockType2["VORBIS_COMMENT"] = 4] = "VORBIS_COMMENT";
    FlacBlockType2[FlacBlockType2["PICTURE"] = 6] = "PICTURE";
  })(FlacBlockType || (FlacBlockType = {}));
  var AC3_ACMOD_CHANNEL_COUNTS = [2, 1, 2, 3, 3, 4, 4, 5];
  var AC3_FRAME_SIZES = [
    // frmsizecod, [48kHz, 44.1kHz, 32kHz] in bytes
    64 * 2,
    69 * 2,
    96 * 2,
    64 * 2,
    70 * 2,
    96 * 2,
    80 * 2,
    87 * 2,
    120 * 2,
    80 * 2,
    88 * 2,
    120 * 2,
    96 * 2,
    104 * 2,
    144 * 2,
    96 * 2,
    105 * 2,
    144 * 2,
    112 * 2,
    121 * 2,
    168 * 2,
    112 * 2,
    122 * 2,
    168 * 2,
    128 * 2,
    139 * 2,
    192 * 2,
    128 * 2,
    140 * 2,
    192 * 2,
    160 * 2,
    174 * 2,
    240 * 2,
    160 * 2,
    175 * 2,
    240 * 2,
    192 * 2,
    208 * 2,
    288 * 2,
    192 * 2,
    209 * 2,
    288 * 2,
    224 * 2,
    243 * 2,
    336 * 2,
    224 * 2,
    244 * 2,
    336 * 2,
    256 * 2,
    278 * 2,
    384 * 2,
    256 * 2,
    279 * 2,
    384 * 2,
    320 * 2,
    348 * 2,
    480 * 2,
    320 * 2,
    349 * 2,
    480 * 2,
    384 * 2,
    417 * 2,
    576 * 2,
    384 * 2,
    418 * 2,
    576 * 2,
    448 * 2,
    487 * 2,
    672 * 2,
    448 * 2,
    488 * 2,
    672 * 2,
    512 * 2,
    557 * 2,
    768 * 2,
    512 * 2,
    558 * 2,
    768 * 2,
    640 * 2,
    696 * 2,
    960 * 2,
    640 * 2,
    697 * 2,
    960 * 2,
    768 * 2,
    835 * 2,
    1152 * 2,
    768 * 2,
    836 * 2,
    1152 * 2,
    896 * 2,
    975 * 2,
    1344 * 2,
    896 * 2,
    976 * 2,
    1344 * 2,
    1024 * 2,
    1114 * 2,
    1536 * 2,
    1024 * 2,
    1115 * 2,
    1536 * 2,
    1152 * 2,
    1253 * 2,
    1728 * 2,
    1152 * 2,
    1254 * 2,
    1728 * 2,
    1280 * 2,
    1393 * 2,
    1920 * 2,
    1280 * 2,
    1394 * 2,
    1920 * 2
  ];
  var AC3_REGISTRATION_DESCRIPTOR = new Uint8Array([5, 4, 65, 67, 45, 51]);
  var EAC3_REGISTRATION_DESCRIPTOR = new Uint8Array([5, 4, 69, 65, 67, 51]);
  var parseEac3Config = (data) => {
    if (data.length < 2) {
      return null;
    }
    const bitstream = new Bitstream(data);
    const dataRate = bitstream.readBits(13);
    const numIndSub = bitstream.readBits(3);
    const substreams = [];
    for (let i3 = 0; i3 <= numIndSub; i3++) {
      if (Math.ceil(bitstream.pos / 8) + 3 > data.length) {
        break;
      }
      const fscod = bitstream.readBits(2);
      const bsid = bitstream.readBits(5);
      bitstream.skipBits(1);
      bitstream.skipBits(1);
      const bsmod = bitstream.readBits(3);
      const acmod = bitstream.readBits(3);
      const lfeon = bitstream.readBits(1);
      bitstream.skipBits(3);
      const numDepSub = bitstream.readBits(4);
      let chanLoc = 0;
      if (numDepSub > 0) {
        chanLoc = bitstream.readBits(9);
      } else {
        bitstream.skipBits(1);
      }
      substreams.push({
        fscod,
        fscod2: null,
        bsid,
        bsmod,
        acmod,
        lfeon,
        numDepSub,
        chanLoc
      });
    }
    if (substreams.length === 0) {
      return null;
    }
    return { dataRate, substreams };
  };
  var getEac3SampleRate = (config) => {
    const sub = config.substreams[0];
    assert(sub);
    if (sub.fscod < 3) {
      return AC3_SAMPLE_RATES[sub.fscod];
    } else if (sub.fscod2 !== null && sub.fscod2 < 3) {
      return EAC3_REDUCED_SAMPLE_RATES[sub.fscod2];
    }
    return null;
  };
  var getEac3ChannelCount = (config) => {
    const sub = config.substreams[0];
    assert(sub);
    let channels = AC3_ACMOD_CHANNEL_COUNTS[sub.acmod] + sub.lfeon;
    if (sub.numDepSub > 0) {
      const CHAN_LOC_COUNTS = [2, 2, 1, 1, 2, 2, 2, 1, 1];
      for (let bit = 0; bit < 9; bit++) {
        if (sub.chanLoc & 1 << 8 - bit) {
          channels += CHAN_LOC_COUNTS[bit];
        }
      }
    }
    return channels;
  };
  var DTS_EXSS_SYNC_WORD = 1683496997;
  var DTS_CORE_FRAME_HEADER_SIZE = 18;
  var DTS_EXSS_HEADER_PREFIX_SIZE = 10;
  var DTS_PCM_BLOCK_SAMPLES = 32;
  var DTS_SPECIFIC_BOX_SIZE = 20;
  var DTS_SUBBAND_SAMPLES = 8;
  var DTS_CORE_SAMPLE_RATES = [
    0,
    8e3,
    16e3,
    32e3,
    0,
    0,
    11025,
    22050,
    44100,
    0,
    0,
    12e3,
    24e3,
    48e3,
    96e3,
    192e3
  ];
  var DTS_CORE_BIT_RATES = [
    32e3,
    56e3,
    64e3,
    96e3,
    112e3,
    128e3,
    192e3,
    224e3,
    256e3,
    32e4,
    384e3,
    448e3,
    512e3,
    576e3,
    64e4,
    768e3,
    96e4,
    1024e3,
    1152e3,
    128e4,
    1344e3,
    1408e3,
    1411200,
    1472e3,
    1536e3,
    192e4,
    2048e3,
    3072e3,
    384e4,
    0,
    0,
    0
  ];
  var DTS_PCM_RESOLUTIONS = [16, 16, 20, 20, 0, 24, 24, 0];
  var DTS_AMODE_CHANNEL_COUNTS = [1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6, 6, 7, 8, 8];
  var DTS_AMODE_CHANNEL_LAYOUTS = [
    1,
    2,
    2,
    2,
    2,
    3,
    18,
    19,
    6,
    7,
    518,
    323,
    83,
    519,
    582,
    535
  ];
  var DTS_CHANNEL_LAYOUT_LFE1 = 8;
  var DTS_CHANNEL_LAYOUT_PAIR_MASK = 44646;
  var DTS_EXSS_REF_CLOCKS = [32e3, 44100, 48e3, 0];
  var DTS_EXSS_SAMPLE_RATES = [
    8e3,
    16e3,
    32e3,
    64e3,
    128e3,
    22050,
    44100,
    88200,
    176400,
    352800,
    12e3,
    24e3,
    48e3,
    96e3,
    192e3,
    384e3
  ];
  var DTS_SPECIFIC_BOX_FRAME_DURATIONS = [512, 1024, 2048, 4096];
  var parseDtsFrame = (data) => {
    const core = parseDtsCoreFrameHeader(data);
    const view = toDataView(data);
    let offset = core ? Math.ceil(core.frameSize / 4) * 4 : 0;
    let firstExss = null;
    while (offset + 4 <= data.length && view.getUint32(offset) === DTS_EXSS_SYNC_WORD) {
      const exss = parseDtsExssHeader(data.subarray(offset));
      if (!exss) {
        break;
      }
      firstExss ??= exss;
      offset += exss.frameSize;
    }
    if (core) {
      return {
        frameSize: firstExss ? offset : core.frameSize,
        sampleRate: core.sampleRate,
        numberOfChannels: core.numberOfChannels,
        sampleCount: core.sampleCount,
        channelLayout: core.channelLayout,
        pcmResolution: core.pcmResolution,
        bitRate: core.bitRate,
        core,
        hasExtensions: firstExss !== null
      };
    }
    if (!firstExss?.asset) {
      return null;
    }
    const { asset } = firstExss;
    return {
      frameSize: offset,
      sampleRate: asset.sampleRate,
      numberOfChannels: asset.numberOfChannels,
      sampleCount: asset.sampleCount,
      channelLayout: asset.channelLayout,
      pcmResolution: asset.pcmResolution,
      bitRate: 0,
      core: null,
      hasExtensions: true
    };
  };
  var extractDtsFourCcFromPacket = (data) => {
    const frameInfo = parseDtsFrame(data);
    if (!frameInfo?.core) {
      return null;
    }
    return frameInfo.hasExtensions ? "dtsh" : "dtsc";
  };
  var parseDtsCoreFrameHeader = (data) => {
    if (data.length < DTS_CORE_FRAME_HEADER_SIZE) {
      return null;
    }
    if (data[0] !== 127 || data[1] !== 254 || data[2] !== 128 || data[3] !== 1) {
      return null;
    }
    const bitstream = new Bitstream(data);
    bitstream.skipBits(32);
    bitstream.skipBits(1);
    if (bitstream.readBits(5) !== DTS_PCM_BLOCK_SAMPLES - 1) {
      return null;
    }
    const cpf = bitstream.readBits(1);
    const npcmblocks = bitstream.readBits(7) + 1;
    if (npcmblocks % DTS_SUBBAND_SAMPLES !== 0) {
      return null;
    }
    const frameSize = bitstream.readBits(14) + 1;
    if (frameSize < 96) {
      return null;
    }
    const amode = bitstream.readBits(6);
    if (amode >= DTS_AMODE_CHANNEL_COUNTS.length) {
      return null;
    }
    const sampleRate = DTS_CORE_SAMPLE_RATES[bitstream.readBits(4)];
    if (sampleRate === 0) {
      return null;
    }
    const bitRate = DTS_CORE_BIT_RATES[bitstream.readBits(5)];
    if (bitstream.readBits(1) !== 0) {
      return null;
    }
    bitstream.skipBits(1 + 1 + 1 + 1);
    bitstream.skipBits(3 + 1 + 1);
    const lff = bitstream.readBits(2);
    if (lff === 3) {
      return null;
    }
    bitstream.skipBits(1);
    if (cpf) {
      bitstream.skipBits(16);
    }
    bitstream.skipBits(1 + 4 + 2);
    const pcmResolution = DTS_PCM_RESOLUTIONS[bitstream.readBits(3)];
    if (pcmResolution === 0) {
      return null;
    }
    const lfePresent = lff !== 0;
    return {
      frameSize,
      sampleRate,
      numberOfChannels: DTS_AMODE_CHANNEL_COUNTS[amode] + (lfePresent ? 1 : 0),
      sampleCount: npcmblocks * DTS_PCM_BLOCK_SAMPLES,
      channelLayout: DTS_AMODE_CHANNEL_LAYOUTS[amode] | (lfePresent ? DTS_CHANNEL_LAYOUT_LFE1 : 0),
      amode,
      lfePresent,
      bitRate,
      pcmResolution
    };
  };
  var parseDtsExssHeader = (data) => {
    if (data.length < DTS_EXSS_HEADER_PREFIX_SIZE) {
      return null;
    }
    if (data[0] !== 100 || data[1] !== 88 || data[2] !== 32 || data[3] !== 37) {
      return null;
    }
    const bitstream = new Bitstream(data);
    bitstream.skipBits(32);
    bitstream.skipBits(8);
    const extSsIndex = bitstream.readBits(2);
    const wideHeader = bitstream.readBits(1);
    const headerSizeBits = 8 + 4 * wideHeader;
    const frameSizeBits = 16 + 4 * wideHeader;
    bitstream.skipBits(headerSizeBits);
    const frameSize = bitstream.readBits(frameSizeBits) + 1;
    const incomplete = { frameSize, asset: null };
    if (!bitstream.readBits(1)) {
      return incomplete;
    }
    const refClock = DTS_EXSS_REF_CLOCKS[bitstream.readBits(2)];
    const frameDurationCycles = 512 * (bitstream.readBits(3) + 1);
    if (bitstream.readBits(1)) {
      bitstream.skipBits(32 + 4);
    }
    const numAudioPresentations = bitstream.readBits(3) + 1;
    const numAssets = bitstream.readBits(3) + 1;
    const activeExssMasks = [];
    for (let i3 = 0; i3 < numAudioPresentations; i3++) {
      activeExssMasks.push(bitstream.readBits(extSsIndex + 1));
    }
    for (const mask of activeExssMasks) {
      bitstream.skipBits(8 * popcount(mask));
    }
    if (bitstream.readBits(1)) {
      bitstream.skipBits(2);
      const spkrMaskBits = bitstream.readBits(2) + 1 << 2;
      const numMixOutConfigs = bitstream.readBits(2) + 1;
      bitstream.skipBits(numMixOutConfigs * spkrMaskBits);
    }
    for (let i3 = 0; i3 < numAssets; i3++) {
      bitstream.skipBits(frameSizeBits);
    }
    bitstream.skipBits(9);
    bitstream.skipBits(3);
    if (bitstream.readBits(1)) {
      bitstream.skipBits(4);
    }
    if (bitstream.readBits(1)) {
      bitstream.skipBits(24);
    }
    if (bitstream.readBits(1)) {
      bitstream.skipBits(8 * (bitstream.readBits(10) + 1));
    }
    const pcmResolution = bitstream.readBits(5) + 1;
    const sampleRate = DTS_EXSS_SAMPLE_RATES[bitstream.readBits(4)];
    const numberOfChannels = bitstream.readBits(8) + 1;
    let channelLayout = 0;
    if (bitstream.readBits(1)) {
      if (numberOfChannels > 2) {
        bitstream.skipBits(1);
      }
      if (numberOfChannels > 6) {
        bitstream.skipBits(1);
      }
      if (bitstream.readBits(1)) {
        const spkrMaskBits = bitstream.readBits(2) + 1 << 2;
        channelLayout = bitstream.readBits(spkrMaskBits);
      }
    }
    if (refClock === 0 || bitstream.getBitsLeft() < 0) {
      return incomplete;
    }
    return {
      frameSize,
      asset: {
        sampleRate,
        numberOfChannels,
        sampleCount: Math.round(frameDurationCycles * sampleRate / refClock),
        channelLayout,
        pcmResolution
      }
    };
  };
  var parseDtsSpecificBox = (data) => {
    if (data.length < DTS_SPECIFIC_BOX_SIZE) {
      return null;
    }
    const view = toDataView(data);
    const sampleRate = view.getUint32(0);
    if (sampleRate === 0) {
      return null;
    }
    const bitstream = new Bitstream(data);
    bitstream.seekToByte(13);
    const frameDuration = bitstream.readBits(2);
    bitstream.skipBits(5);
    const coreLfePresent = bitstream.readBits(1);
    const coreLayout = bitstream.readBits(6);
    bitstream.skipBits(14);
    bitstream.skipBits(1);
    bitstream.skipBits(3);
    const channelLayout = bitstream.readBits(16);
    let numberOfChannels = null;
    if (channelLayout !== 0) {
      numberOfChannels = getDtsChannelCount(channelLayout);
    } else if (coreLayout < DTS_AMODE_CHANNEL_COUNTS.length) {
      numberOfChannels = DTS_AMODE_CHANNEL_COUNTS[coreLayout] + coreLfePresent;
    }
    return {
      sampleRate,
      maxBitrate: view.getUint32(4),
      avgBitrate: view.getUint32(8),
      pcmSampleDepth: data[12],
      sampleCount: DTS_SPECIFIC_BOX_FRAME_DURATIONS[frameDuration],
      channelLayout,
      numberOfChannels
    };
  };
  var getDtsChannelCount = (channelLayout) => {
    return popcount(channelLayout) + popcount(channelLayout & DTS_CHANNEL_LAYOUT_PAIR_MASK);
  };

  // node_modules/mediabunny/dist/modules/src/codec.js
  var PCM_AUDIO_CODECS = [
    "pcm-s16",
    // We don't prefix 'le' so we're compatible with the WebCodecs-registered PCM codec strings
    "pcm-s16be",
    "pcm-s24",
    "pcm-s24be",
    "pcm-s32",
    "pcm-s32be",
    "pcm-f32",
    "pcm-f32be",
    "pcm-f64",
    "pcm-f64be",
    "pcm-u8",
    "pcm-s8",
    "ulaw",
    "alaw"
  ];
  var NON_PCM_AUDIO_CODECS = [
    "aac",
    "opus",
    "mp3",
    "vorbis",
    "flac",
    "ac3",
    "eac3",
    "dts"
  ];
  var AUDIO_CODECS = [
    ...NON_PCM_AUDIO_CODECS,
    ...PCM_AUDIO_CODECS
  ];
  var AVC_LEVEL_TABLE = [
    { maxMacroblocks: 99, maxBitrate: 64e3, maxDpbMbs: 396, level: 10 },
    // Level 1
    { maxMacroblocks: 396, maxBitrate: 192e3, maxDpbMbs: 900, level: 11 },
    // Level 1.1
    { maxMacroblocks: 396, maxBitrate: 384e3, maxDpbMbs: 2376, level: 12 },
    // Level 1.2
    { maxMacroblocks: 396, maxBitrate: 768e3, maxDpbMbs: 2376, level: 13 },
    // Level 1.3
    { maxMacroblocks: 396, maxBitrate: 2e6, maxDpbMbs: 2376, level: 20 },
    // Level 2
    { maxMacroblocks: 792, maxBitrate: 4e6, maxDpbMbs: 4752, level: 21 },
    // Level 2.1
    { maxMacroblocks: 1620, maxBitrate: 4e6, maxDpbMbs: 8100, level: 22 },
    // Level 2.2
    { maxMacroblocks: 1620, maxBitrate: 1e7, maxDpbMbs: 8100, level: 30 },
    // Level 3
    { maxMacroblocks: 3600, maxBitrate: 14e6, maxDpbMbs: 18e3, level: 31 },
    // Level 3.1
    { maxMacroblocks: 5120, maxBitrate: 2e7, maxDpbMbs: 20480, level: 32 },
    // Level 3.2
    { maxMacroblocks: 8192, maxBitrate: 2e7, maxDpbMbs: 32768, level: 40 },
    // Level 4
    { maxMacroblocks: 8192, maxBitrate: 5e7, maxDpbMbs: 32768, level: 41 },
    // Level 4.1
    { maxMacroblocks: 8704, maxBitrate: 5e7, maxDpbMbs: 34816, level: 42 },
    // Level 4.2
    { maxMacroblocks: 22080, maxBitrate: 135e6, maxDpbMbs: 110400, level: 50 },
    // Level 5
    { maxMacroblocks: 36864, maxBitrate: 24e7, maxDpbMbs: 184320, level: 51 },
    // Level 5.1
    { maxMacroblocks: 36864, maxBitrate: 24e7, maxDpbMbs: 184320, level: 52 },
    // Level 5.2
    { maxMacroblocks: 139264, maxBitrate: 24e7, maxDpbMbs: 696320, level: 60 },
    // Level 6
    { maxMacroblocks: 139264, maxBitrate: 48e7, maxDpbMbs: 696320, level: 61 },
    // Level 6.1
    { maxMacroblocks: 139264, maxBitrate: 8e8, maxDpbMbs: 696320, level: 62 }
    // Level 6.2
  ];
  var VP9_LEVEL_TABLE = [
    { maxPictureSize: 36864, maxBitrate: 2e5, level: 10 },
    // Level 1
    { maxPictureSize: 73728, maxBitrate: 8e5, level: 11 },
    // Level 1.1
    { maxPictureSize: 122880, maxBitrate: 18e5, level: 20 },
    // Level 2
    { maxPictureSize: 245760, maxBitrate: 36e5, level: 21 },
    // Level 2.1
    { maxPictureSize: 552960, maxBitrate: 72e5, level: 30 },
    // Level 3
    { maxPictureSize: 983040, maxBitrate: 12e6, level: 31 },
    // Level 3.1
    { maxPictureSize: 2228224, maxBitrate: 18e6, level: 40 },
    // Level 4
    { maxPictureSize: 2228224, maxBitrate: 3e7, level: 41 },
    // Level 4.1
    { maxPictureSize: 8912896, maxBitrate: 6e7, level: 50 },
    // Level 5
    { maxPictureSize: 8912896, maxBitrate: 12e7, level: 51 },
    // Level 5.1
    { maxPictureSize: 8912896, maxBitrate: 18e7, level: 52 },
    // Level 5.2
    { maxPictureSize: 35651584, maxBitrate: 18e7, level: 60 },
    // Level 6
    { maxPictureSize: 35651584, maxBitrate: 24e7, level: 61 },
    // Level 6.1
    { maxPictureSize: 35651584, maxBitrate: 48e7, level: 62 }
    // Level 6.2
  ];
  var VP9_DEFAULT_SUFFIX = ".01.01.01.01.00";
  var AV1_DEFAULT_SUFFIX = ".0.110.01.01.01.0";
  var PRORES_FOURCCS = [
    "ap4x",
    // ProRes 4444 XQ
    "ap4h",
    // ProRes 4444
    "apch",
    // ProRes 422 High Quality
    "apcn",
    // ProRes 422 Standard Definition
    "apcs",
    // ProRes 422 LT
    "apco"
    // ProRes 422 Proxy
  ];
  var DTS_FOURCCS = [
    "dtsc",
    // DTS core
    "dtsh",
    // DTS-HD, core plus extension substreams
    "dtsl",
    // DTS-HD Lossless, no core
    "dtse"
    // DTS Express
  ];
  var extractVideoCodecString = (trackInfo) => {
    const { codec, codecDescription, colorSpace, avcCodecInfo, hevcCodecInfo, vp9CodecInfo, av1CodecInfo, proresFormat } = trackInfo;
    if (codec === "avc") {
      assert(trackInfo.avcType !== null);
      if (avcCodecInfo) {
        const bytes = new Uint8Array([
          avcCodecInfo.avcProfileIndication,
          avcCodecInfo.profileCompatibility,
          avcCodecInfo.avcLevelIndication
        ]);
        return `avc${trackInfo.avcType}.${bytesToHexString(bytes)}`;
      }
      if (!codecDescription || codecDescription.byteLength < 4) {
        throw new TypeError("AVC decoder description is not provided or is not at least 4 bytes long.");
      }
      return `avc${trackInfo.avcType}.${bytesToHexString(codecDescription.subarray(1, 4))}`;
    } else if (codec === "hevc") {
      let generalProfileSpace;
      let generalProfileIdc;
      let compatibilityFlags;
      let generalTierFlag;
      let generalLevelIdc;
      let constraintFlags;
      if (hevcCodecInfo) {
        generalProfileSpace = hevcCodecInfo.generalProfileSpace;
        generalProfileIdc = hevcCodecInfo.generalProfileIdc;
        compatibilityFlags = reverseBitsU32(hevcCodecInfo.generalProfileCompatibilityFlags);
        generalTierFlag = hevcCodecInfo.generalTierFlag;
        generalLevelIdc = hevcCodecInfo.generalLevelIdc;
        constraintFlags = [...hevcCodecInfo.generalConstraintIndicatorFlags];
      } else {
        if (!codecDescription || codecDescription.byteLength < 23) {
          throw new TypeError("HEVC decoder description is not provided or is not at least 23 bytes long.");
        }
        const view = toDataView(codecDescription);
        const profileByte = view.getUint8(1);
        generalProfileSpace = profileByte >> 6 & 3;
        generalProfileIdc = profileByte & 31;
        compatibilityFlags = reverseBitsU32(view.getUint32(2));
        generalTierFlag = profileByte >> 5 & 1;
        generalLevelIdc = view.getUint8(12);
        constraintFlags = [];
        for (let i3 = 0; i3 < 6; i3++) {
          constraintFlags.push(view.getUint8(6 + i3));
        }
      }
      let codecString = "hev1.";
      codecString += ["", "A", "B", "C"][generalProfileSpace] + generalProfileIdc;
      codecString += ".";
      codecString += compatibilityFlags.toString(16).toUpperCase();
      codecString += ".";
      codecString += generalTierFlag === 0 ? "L" : "H";
      codecString += generalLevelIdc;
      while (constraintFlags.length > 0 && constraintFlags[constraintFlags.length - 1] === 0) {
        constraintFlags.pop();
      }
      if (constraintFlags.length > 0) {
        codecString += ".";
        codecString += constraintFlags.map((x2) => x2.toString(16).toUpperCase()).join(".");
      }
      return codecString;
    } else if (codec === "vp8") {
      return "vp8";
    } else if (codec === "vp9") {
      if (!vp9CodecInfo) {
        const pictureSize = trackInfo.width * trackInfo.height;
        let level2 = last(VP9_LEVEL_TABLE).level;
        for (const entry of VP9_LEVEL_TABLE) {
          if (pictureSize <= entry.maxPictureSize) {
            level2 = entry.level;
            break;
          }
        }
        return `vp09.00.${level2.toString().padStart(2, "0")}.08`;
      }
      const profile = vp9CodecInfo.profile.toString().padStart(2, "0");
      const level = vp9CodecInfo.level.toString().padStart(2, "0");
      const bitDepth = vp9CodecInfo.bitDepth.toString().padStart(2, "0");
      const chromaSubsampling = vp9CodecInfo.chromaSubsampling.toString().padStart(2, "0");
      const colourPrimaries = vp9CodecInfo.colourPrimaries.toString().padStart(2, "0");
      const transferCharacteristics = vp9CodecInfo.transferCharacteristics.toString().padStart(2, "0");
      const matrixCoefficients = vp9CodecInfo.matrixCoefficients.toString().padStart(2, "0");
      const videoFullRangeFlag = vp9CodecInfo.videoFullRangeFlag.toString().padStart(2, "0");
      let string = `vp09.${profile}.${level}.${bitDepth}.${chromaSubsampling}`;
      string += `.${colourPrimaries}.${transferCharacteristics}.${matrixCoefficients}.${videoFullRangeFlag}`;
      if (string.endsWith(VP9_DEFAULT_SUFFIX)) {
        string = string.slice(0, -VP9_DEFAULT_SUFFIX.length);
      }
      return string;
    } else if (codec === "av1") {
      if (!av1CodecInfo) {
        const pictureSize = trackInfo.width * trackInfo.height;
        let level2 = last(VP9_LEVEL_TABLE).level;
        for (const entry of VP9_LEVEL_TABLE) {
          if (pictureSize <= entry.maxPictureSize) {
            level2 = entry.level;
            break;
          }
        }
        return `av01.0.${level2.toString().padStart(2, "0")}M.08`;
      }
      const profile = av1CodecInfo.profile;
      const level = av1CodecInfo.level.toString().padStart(2, "0");
      const tier = av1CodecInfo.tier ? "H" : "M";
      const bitDepth = av1CodecInfo.bitDepth.toString().padStart(2, "0");
      const monochrome = av1CodecInfo.monochrome ? "1" : "0";
      const chromaSubsampling = 100 * av1CodecInfo.chromaSubsamplingX + 10 * av1CodecInfo.chromaSubsamplingY + 1 * (av1CodecInfo.chromaSubsamplingX && av1CodecInfo.chromaSubsamplingY ? av1CodecInfo.chromaSamplePosition : 0);
      let colorPrimaries;
      let transferCharacteristics;
      let matrixCoefficients;
      let videoFullRangeFlag;
      if (av1CodecInfoHasColorInfo(av1CodecInfo)) {
        colorPrimaries = av1CodecInfo.colourPrimaries;
        transferCharacteristics = av1CodecInfo.transferCharacteristics;
        matrixCoefficients = av1CodecInfo.matrixCoefficients;
        videoFullRangeFlag = av1CodecInfo.videoFullRangeFlag;
      } else {
        colorPrimaries = colorSpace?.primaries ? COLOR_PRIMARIES_MAP[colorSpace.primaries] : 1;
        transferCharacteristics = colorSpace?.transfer ? TRANSFER_CHARACTERISTICS_MAP[colorSpace.transfer] : 1;
        matrixCoefficients = colorSpace?.matrix ? MATRIX_COEFFICIENTS_MAP[colorSpace.matrix] : 1;
        videoFullRangeFlag = colorSpace?.fullRange ? 1 : 0;
      }
      let string = `av01.${profile}.${level}${tier}.${bitDepth}`;
      string += `.${monochrome}.${chromaSubsampling.toString().padStart(3, "0")}`;
      string += `.${colorPrimaries.toString().padStart(2, "0")}`;
      string += `.${transferCharacteristics.toString().padStart(2, "0")}`;
      string += `.${matrixCoefficients.toString().padStart(2, "0")}`;
      string += `.${videoFullRangeFlag}`;
      if (string.endsWith(AV1_DEFAULT_SUFFIX)) {
        string = string.slice(0, -AV1_DEFAULT_SUFFIX.length);
      }
      return string;
    } else if (codec === "prores") {
      return proresFormat ?? "apch";
    } else if (codec !== null) {
      assertNever(codec);
    }
    throw new TypeError(`Unhandled codec '${codec}'.`);
  };
  var extractColorSpace = (info) => {
    switch (info.codec) {
      case "avc":
        {
          let spsData = info.avcCodecInfo?.sequenceParameterSets[0];
          if (!spsData && info.codecDescription) {
            spsData = deserializeAvcDecoderConfigurationRecord(info.codecDescription)?.sequenceParameterSets[0];
          }
          if (spsData) {
            const spsInfo = parseAvcSps(spsData);
            if (spsInfo) {
              return {
                primaries: COLOR_PRIMARIES_MAP_INVERSE[spsInfo.colourPrimaries],
                transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[spsInfo.transferCharacteristics],
                matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[spsInfo.matrixCoefficients],
                fullRange: !!spsInfo.fullRangeFlag
              };
            }
          }
        }
        ;
        break;
      case "hevc":
        {
          let spsData = info.hevcCodecInfo?.arrays.find((x2) => x2.nalUnitType === HevcNalUnitType.SPS_NUT)?.nalUnits[0];
          if (!spsData && info.codecDescription) {
            spsData = deserializeHevcDecoderConfigurationRecord(info.codecDescription)?.arrays.find((x2) => x2.nalUnitType === HevcNalUnitType.SPS_NUT)?.nalUnits[0];
          }
          if (spsData) {
            const spsInfo = parseHevcSps(spsData);
            if (spsInfo) {
              return {
                primaries: COLOR_PRIMARIES_MAP_INVERSE[spsInfo.colourPrimaries],
                transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[spsInfo.transferCharacteristics],
                matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[spsInfo.matrixCoefficients],
                fullRange: !!spsInfo.fullRangeFlag
              };
            }
          }
        }
        ;
        break;
      case "vp8":
        {
        }
        ;
        break;
      case "vp9":
        {
          if (info.vp9CodecInfo) {
            return {
              primaries: COLOR_PRIMARIES_MAP_INVERSE[info.vp9CodecInfo.colourPrimaries],
              transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[info.vp9CodecInfo.transferCharacteristics],
              matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[info.vp9CodecInfo.matrixCoefficients],
              fullRange: !!info.vp9CodecInfo.videoFullRangeFlag
            };
          }
        }
        ;
        break;
      case "av1":
        {
          if (info.av1CodecInfo) {
            return {
              primaries: COLOR_PRIMARIES_MAP_INVERSE[info.av1CodecInfo.colourPrimaries],
              transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[info.av1CodecInfo.transferCharacteristics],
              matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[info.av1CodecInfo.matrixCoefficients],
              fullRange: !!info.av1CodecInfo.videoFullRangeFlag
            };
          }
        }
        ;
        break;
      case "prores":
        {
          if (info.proresCodecInfo) {
            return {
              primaries: COLOR_PRIMARIES_MAP_INVERSE[info.proresCodecInfo.colourPrimaries],
              transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[info.proresCodecInfo.transferCharacteristics],
              matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[info.proresCodecInfo.matrixCoefficients],
              fullRange: info.proresCodecInfo.fullRange
            };
          }
        }
        ;
        break;
    }
    return {
      primaries: void 0,
      transfer: void 0,
      matrix: void 0,
      fullRange: void 0
    };
  };
  var extractAudioCodecString = (trackInfo) => {
    const { codec, codecDescription, aacCodecInfo, dtsFormat } = trackInfo;
    if (codec === "aac") {
      if (!aacCodecInfo) {
        throw new TypeError("AAC codec info must be provided.");
      }
      if (aacCodecInfo.isMpeg2) {
        return "mp4a.67";
      } else {
        let objectType;
        if (aacCodecInfo.objectType !== null) {
          objectType = aacCodecInfo.objectType;
        } else {
          const audioSpecificConfig = parseAacAudioSpecificConfig(codecDescription);
          objectType = audioSpecificConfig.objectType;
        }
        return `mp4a.40.${objectType}`;
      }
    } else if (codec === "mp3") {
      return "mp3";
    } else if (codec === "opus") {
      return "opus";
    } else if (codec === "vorbis") {
      return "vorbis";
    } else if (codec === "flac") {
      return "flac";
    } else if (codec === "ac3") {
      return "ac-3";
    } else if (codec === "eac3") {
      return "ec-3";
    } else if (codec === "dts") {
      return dtsFormat ?? "dtsc";
    } else if (codec && PCM_AUDIO_CODECS.includes(codec)) {
      return codec;
    }
    throw new TypeError(`Unhandled codec '${codec}'.`);
  };
  var OPUS_SAMPLE_RATE = 48e3;
  var PCM_CODEC_REGEX = /^pcm-([usf])(\d+)(be)?$/;
  var parsePcmCodec = (codec) => {
    assert(PCM_AUDIO_CODECS.includes(codec));
    if (codec === "ulaw") {
      return { dataType: "ulaw", sampleSize: 1, littleEndian: true, silentValue: 255 };
    } else if (codec === "alaw") {
      return { dataType: "alaw", sampleSize: 1, littleEndian: true, silentValue: 213 };
    }
    const match = PCM_CODEC_REGEX.exec(codec);
    assert(match);
    let dataType;
    if (match[1] === "u") {
      dataType = "unsigned";
    } else if (match[1] === "s") {
      dataType = "signed";
    } else {
      dataType = "float";
    }
    const sampleSize = Number(match[2]) / 8;
    const littleEndian = match[3] !== "be";
    const silentValue = codec === "pcm-u8" ? 2 ** 7 : 0;
    return { dataType, sampleSize, littleEndian, silentValue };
  };
  var VALID_VIDEO_CODEC_STRING_PREFIXES = ["avc1", "avc3", "hev1", "hvc1", "vp8", "vp09", "av01", ...PRORES_FOURCCS];

  // node_modules/mediabunny/dist/modules/src/demuxer.js
  var Demuxer = class {
    constructor(input) {
      this.input = input;
    }
    dispose() {
    }
  };

  // node_modules/mediabunny/dist/modules/src/packet.js
  var PLACEHOLDER_DATA = /* @__PURE__ */ new Uint8Array(0);
  var EncodedPacket = class _EncodedPacket {
    /** Creates a new {@link EncodedPacket} from raw bytes and timing information. */
    constructor(data, type, timestamp, duration, sequenceNumber = -1, byteLength, sideData) {
      this.data = data;
      this.type = type;
      this.timestamp = timestamp;
      this.duration = duration;
      this.sequenceNumber = sequenceNumber;
      if (data === PLACEHOLDER_DATA && byteLength === void 0) {
        throw new Error("Internal error: byteLength must be explicitly provided when constructing metadata-only packets.");
      }
      if (byteLength === void 0) {
        byteLength = data.byteLength;
      }
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("data must be a Uint8Array.");
      }
      if (type !== "key" && type !== "delta") {
        throw new TypeError('type must be either "key" or "delta".');
      }
      if (!Number.isFinite(timestamp)) {
        throw new TypeError("timestamp must be a number.");
      }
      if (!Number.isFinite(duration) || duration < 0) {
        throw new TypeError("duration must be a non-negative number.");
      }
      if (!Number.isFinite(sequenceNumber)) {
        throw new TypeError("sequenceNumber must be a number.");
      }
      if (!Number.isInteger(byteLength) || byteLength < 0) {
        throw new TypeError("byteLength must be a non-negative integer.");
      }
      if (sideData !== void 0 && (typeof sideData !== "object" || !sideData)) {
        throw new TypeError("sideData, when provided, must be an object.");
      }
      if (sideData?.alpha !== void 0 && !(sideData.alpha instanceof Uint8Array)) {
        throw new TypeError("sideData.alpha, when provided, must be a Uint8Array.");
      }
      if (sideData?.alphaByteLength !== void 0 && (!Number.isInteger(sideData.alphaByteLength) || sideData.alphaByteLength < 0)) {
        throw new TypeError("sideData.alphaByteLength, when provided, must be a non-negative integer.");
      }
      this.byteLength = byteLength;
      this.sideData = sideData ?? {};
      if (this.sideData.alpha && this.sideData.alphaByteLength === void 0) {
        this.sideData.alphaByteLength = this.sideData.alpha.byteLength;
      }
    }
    /**
     * If this packet is a metadata-only packet. Metadata-only packets don't contain their packet data. They are the
     * result of retrieving packets with {@link PacketRetrievalOptions.metadataOnly} set to `true`.
     */
    get isMetadataOnly() {
      return this.data === PLACEHOLDER_DATA;
    }
    /** The timestamp of this packet in microseconds. */
    get microsecondTimestamp() {
      return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.timestamp);
    }
    /** The duration of this packet in microseconds. */
    get microsecondDuration() {
      return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.duration);
    }
    /** Converts this packet to an
     * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) for use with the
     * WebCodecs API. */
    toEncodedVideoChunk() {
      if (this.isMetadataOnly) {
        throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");
      }
      if (typeof EncodedVideoChunk === "undefined") {
        throw new Error("EncodedVideoChunk is not available in this environment.");
      }
      return new EncodedVideoChunk({
        data: this.data,
        type: this.type,
        timestamp: this.microsecondTimestamp,
        duration: this.microsecondDuration
      });
    }
    /**
     * Converts this packet to an
     * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) for use with the
     * WebCodecs API, using the alpha side data instead of the color data. Throws if no alpha side data is defined.
     */
    alphaToEncodedVideoChunk(type = this.type) {
      if (!this.sideData.alpha) {
        throw new TypeError("This packet does not contain alpha side data.");
      }
      if (this.isMetadataOnly) {
        throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");
      }
      if (typeof EncodedVideoChunk === "undefined") {
        throw new Error("EncodedVideoChunk is not available in this environment.");
      }
      return new EncodedVideoChunk({
        data: this.sideData.alpha,
        type,
        timestamp: this.microsecondTimestamp,
        duration: this.microsecondDuration
      });
    }
    /** Converts this packet to an
     * [`EncodedAudioChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk) for use with the
     * WebCodecs API. */
    toEncodedAudioChunk() {
      if (this.isMetadataOnly) {
        throw new TypeError("Metadata-only packets cannot be converted to an audio chunk.");
      }
      if (typeof EncodedAudioChunk === "undefined") {
        throw new Error("EncodedAudioChunk is not available in this environment.");
      }
      return new EncodedAudioChunk({
        data: this.data,
        type: this.type,
        timestamp: this.microsecondTimestamp,
        duration: this.microsecondDuration
      });
    }
    /**
     * Creates an {@link EncodedPacket} from an
     * [`EncodedVideoChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk) or
     * [`EncodedAudioChunk`](https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk). This method is useful
     * for converting chunks from the WebCodecs API to `EncodedPacket` instances.
     */
    static fromEncodedChunk(chunk, sideData) {
      if (!(chunk instanceof EncodedVideoChunk || chunk instanceof EncodedAudioChunk)) {
        throw new TypeError("chunk must be an EncodedVideoChunk or EncodedAudioChunk.");
      }
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      return new _EncodedPacket(data, chunk.type, chunk.timestamp / 1e6, (chunk.duration ?? 0) / 1e6, void 0, void 0, sideData);
    }
    /** Clones this packet while optionally modifying the new packet's data. */
    clone(options) {
      if (options !== void 0 && (typeof options !== "object" || options === null)) {
        throw new TypeError("options, when provided, must be an object.");
      }
      if (options?.data !== void 0 && !(options.data instanceof Uint8Array)) {
        throw new TypeError("options.data, when provided, must be a Uint8Array.");
      }
      if (options?.type !== void 0 && options.type !== "key" && options.type !== "delta") {
        throw new TypeError('options.type, when provided, must be either "key" or "delta".');
      }
      if (options?.timestamp !== void 0 && !Number.isFinite(options.timestamp)) {
        throw new TypeError("options.timestamp, when provided, must be a number.");
      }
      if (options?.duration !== void 0 && !Number.isFinite(options.duration)) {
        throw new TypeError("options.duration, when provided, must be a number.");
      }
      if (options?.sequenceNumber !== void 0 && !Number.isFinite(options.sequenceNumber)) {
        throw new TypeError("options.sequenceNumber, when provided, must be a number.");
      }
      if (options?.sideData !== void 0 && (typeof options.sideData !== "object" || options.sideData === null)) {
        throw new TypeError("options.sideData, when provided, must be an object.");
      }
      return new _EncodedPacket(options?.data ?? this.data, options?.type ?? this.type, options?.timestamp ?? this.timestamp, options?.duration ?? this.duration, options?.sequenceNumber ?? this.sequenceNumber, this.byteLength, options?.sideData ?? this.sideData);
    }
  };

  // node_modules/mediabunny/dist/modules/src/isobmff/isobmff-misc.js
  var buildIsobmffMimeType = (info) => {
    const base = info.hasVideo ? "video/" : info.hasAudio ? "audio/" : "application/";
    let string = base + (info.isQuickTime ? "quicktime" : "mp4");
    if (info.codecStrings.length > 0) {
      const uniqueCodecMimeTypes = [...new Set(info.codecStrings)];
      string += `; codecs="${uniqueCodecMimeTypes.join(", ")}"`;
    }
    return string;
  };
  var parsePsshBoxContents = (contents) => {
    const view = toDataView(contents);
    let pos = 0;
    const version = view.getUint8(pos);
    pos += 1;
    pos += 3;
    const systemId = bytesToHexString(contents.subarray(pos, pos + 16));
    pos += 16;
    let keyIds = null;
    if (version > 0) {
      const kidCount = view.getUint32(pos);
      pos += 4;
      if (kidCount > 0) {
        keyIds = [];
        for (let i3 = 0; i3 < kidCount; i3++) {
          keyIds.push(bytesToHexString(contents.subarray(pos, pos + 16)));
          pos += 16;
        }
      }
    }
    const dataSize = view.getUint32(pos);
    pos += 4;
    return {
      systemId,
      keyIds,
      data: contents.slice(pos, pos + dataSize)
    };
  };
  var psshBoxesAreEqual = (a3, b2) => a3.systemId === b2.systemId && uint8ArraysAreEqual(a3.data, b2.data);

  // node_modules/mediabunny/dist/modules/src/isobmff/isobmff-reader.js
  var MIN_BOX_HEADER_SIZE = 8;
  var MAX_BOX_HEADER_SIZE = 16;
  var readBoxHeader = (slice) => {
    let totalSize = readU32Be(slice);
    const name = readAscii(slice, 4);
    let headerSize = 8;
    const hasLargeSize = totalSize === 1;
    if (hasLargeSize) {
      totalSize = readU64Be(slice);
      headerSize = 16;
    }
    const contentSize = totalSize - headerSize;
    if (contentSize < 0) {
      return null;
    }
    return { name, totalSize, headerSize, contentSize };
  };
  var readFixed_16_16 = (slice) => {
    return readI32Be(slice) / 65536;
  };
  var readFixed_2_30 = (slice) => {
    return readI32Be(slice) / 1073741824;
  };
  var readIsomVariableInteger = (slice) => {
    let result = 0;
    for (let i3 = 0; i3 < 4; i3++) {
      result <<= 7;
      const nextByte = readU8(slice);
      result |= nextByte & 127;
      if ((nextByte & 128) === 0) {
        break;
      }
    }
    return result;
  };
  var readEsDescriptor = (slice) => {
    const tag = readU8(slice);
    if (tag !== 3) {
      throw new Error("Invalid esds: expected ES_Descriptor.");
    }
    readIsomVariableInteger(slice);
    slice.skip(2);
    const mixed = readU8(slice);
    const streamDependenceFlag = (mixed & 128) !== 0;
    const urlFlag = (mixed & 64) !== 0;
    const ocrStreamFlag = (mixed & 32) !== 0;
    if (streamDependenceFlag) {
      slice.skip(2);
    }
    if (urlFlag) {
      const urlLength = readU8(slice);
      slice.skip(urlLength);
    }
    if (ocrStreamFlag) {
      slice.skip(2);
    }
    const decoderConfigTag = readU8(slice);
    if (decoderConfigTag !== 4) {
      throw new Error("Invalid esds: expected DecoderConfigDescriptor.");
    }
    const decoderConfigDescriptorLength = readIsomVariableInteger(slice);
    const payloadStart = slice.filePos;
    const objectTypeIndication = readU8(slice);
    slice.skip(1 + 3 + 4 + 4);
    let decoderSpecificInfo = null;
    if (decoderConfigDescriptorLength > slice.filePos - payloadStart) {
      const decoderSpecificInfoTag = readU8(slice);
      if (decoderSpecificInfoTag !== 5) {
        throw new Error("Invalid esds: expected DecoderSpecificInfo.");
      }
      const decoderSpecificInfoLength = readIsomVariableInteger(slice);
      decoderSpecificInfo = readBytes(slice, decoderSpecificInfoLength);
    }
    return {
      objectTypeIndication,
      decoderSpecificInfo
    };
  };
  var readMetadataStringShort = (slice) => {
    let stringLength = readU16Be(slice);
    slice.skip(2);
    stringLength = Math.min(stringLength, slice.remainingLength);
    return textDecoder.decode(readBytes(slice, stringLength));
  };
  var readDataBox = (slice) => {
    const header = readBoxHeader(slice);
    if (!header || header.name !== "data") {
      return null;
    }
    if (slice.remainingLength < 8) {
      return null;
    }
    const typeIndicator = readU32Be(slice);
    slice.skip(4);
    const data = readBytes(slice, header.contentSize - 8);
    switch (typeIndicator) {
      case 1:
        return textDecoder.decode(data);
      // UTF-8
      case 2:
        return new TextDecoder2("utf-16be").decode(data);
      // UTF-16-BE
      case 13:
        return new RichImageData(data, "image/jpeg");
      case 14:
        return new RichImageData(data, "image/png");
      case 27:
        return new RichImageData(data, "image/bmp");
      default:
        return data;
    }
  };

  // node_modules/mediabunny/dist/modules/src/aes.js
  var AES_128_BLOCK_SIZE = 16;
  var Te4 = new Uint32Array(256);
  var Td0 = new Uint32Array(256);
  var Td1 = new Uint32Array(256);
  var Td2 = new Uint32Array(256);
  var Td3 = new Uint32Array(256);
  var Td4 = new Uint32Array(256);
  var rcon = new Uint32Array(10);
  var tablesGenerated = false;
  var generateAesTables = () => {
    const sbox = new Uint8Array(256);
    const log = new Uint8Array(256);
    const pow = new Uint8Array(256);
    for (let i3 = 0, p3 = 1; i3 < 256; i3++) {
      pow[i3] = p3;
      log[p3] = i3;
      p3 = p3 ^ p3 << 1 ^ (p3 & 128 ? 283 : 0);
    }
    const mul = (a3, b2) => a3 && b2 ? pow[(log[a3] + log[b2]) % 255] : 0;
    sbox[0] = 99;
    for (let i3 = 1; i3 < 256; i3++) {
      const x2 = pow[255 - log[i3]];
      let s3 = x2 ^ x2 << 1 ^ x2 << 2 ^ x2 << 3 ^ x2 << 4;
      s3 = s3 >>> 8 ^ s3 & 255 ^ 99;
      sbox[i3] = s3;
    }
    for (let i3 = 0; i3 < 256; i3++) {
      const s3 = sbox[i3];
      const is = sbox.indexOf(i3);
      Te4[i3] = s3 << 24 | s3 << 16 | s3 << 8 | s3;
      Td4[i3] = is << 24 | is << 16 | is << 8 | is;
      const b0 = mul(is, 14);
      const b1 = mul(is, 9);
      const b2 = mul(is, 13);
      const b3 = mul(is, 11);
      const w3 = b0 << 24 | b1 << 16 | b2 << 8 | b3;
      Td0[i3] = w3;
      Td1[i3] = w3 >>> 8 | w3 << 24;
      Td2[i3] = w3 >>> 16 | w3 << 16;
      Td3[i3] = w3 >>> 24 | w3 << 8;
    }
    let r3 = 1;
    for (let i3 = 0; i3 < 10; i3++) {
      rcon[i3] = r3 << 24;
      r3 = r3 << 1 ^ (r3 & 128 ? 283 : 0);
    }
    tablesGenerated = true;
  };
  var Aes128CbcContext = class {
    constructor() {
      this.roundkey = new Uint32Array(44);
      this.iv = new Uint32Array(AES_128_BLOCK_SIZE / Uint32Array.BYTES_PER_ELEMENT);
      this.in = new Uint8Array(AES_128_BLOCK_SIZE);
      this.out = new Uint8Array(AES_128_BLOCK_SIZE);
      this.inView = new DataView(this.in.buffer);
      this.outView = new DataView(this.out.buffer);
    }
    init({ key, iv }) {
      assert(key.byteLength === 16);
      assert(iv.byteLength === 16);
      if (!tablesGenerated) {
        generateAesTables();
      }
      const keyView = new DataView(key.buffer, key.byteOffset, key.byteLength);
      const ivView = new DataView(iv.buffer, iv.byteOffset, iv.byteLength);
      this.roundkey[0] = keyView.getUint32(0, false);
      this.roundkey[1] = keyView.getUint32(4, false);
      this.roundkey[2] = keyView.getUint32(8, false);
      this.roundkey[3] = keyView.getUint32(12, false);
      this.iv[0] = ivView.getUint32(0, false);
      this.iv[1] = ivView.getUint32(4, false);
      this.iv[2] = ivView.getUint32(8, false);
      this.iv[3] = ivView.getUint32(12, false);
      for (let index = 4; index < 44; index += 4) {
        const temp = this.roundkey[index - 1];
        this.roundkey[index] = this.roundkey[index - 4] ^ Te4[temp >>> 16 & 255] & 4278190080 ^ Te4[temp >>> 8 & 255] & 16711680 ^ Te4[temp >>> 0 & 255] & 65280 ^ Te4[temp >>> 24 & 255] & 255 ^ rcon[index / 4 - 1];
        this.roundkey[index + 1] = this.roundkey[index - 3] ^ this.roundkey[index];
        this.roundkey[index + 2] = this.roundkey[index - 2] ^ this.roundkey[index + 1];
        this.roundkey[index + 3] = this.roundkey[index - 1] ^ this.roundkey[index + 2];
      }
      for (let i3 = 0, j3 = 40; i3 < j3; i3 += 4, j3 -= 4) {
        for (let k3 = 0; k3 < 4; k3++) {
          const temp = this.roundkey[i3 + k3];
          this.roundkey[i3 + k3] = this.roundkey[j3 + k3];
          this.roundkey[j3 + k3] = temp;
        }
      }
      for (let index = 4; index < 40; index += 4) {
        for (let k3 = 0; k3 < 4; k3++) {
          const rk = this.roundkey[index + k3];
          this.roundkey[index + k3] = Td0[Te4[rk >>> 24 & 255] & 255] ^ Td1[Te4[rk >>> 16 & 255] & 255] ^ Td2[Te4[rk >>> 8 & 255] & 255] ^ Td3[Te4[rk >>> 0 & 255] & 255];
        }
      }
    }
    decrypt() {
      let s0 = this.inView.getUint32(0, false) ^ this.roundkey[0];
      let s1 = this.inView.getUint32(4, false) ^ this.roundkey[1];
      let s22 = this.inView.getUint32(8, false) ^ this.roundkey[2];
      let s3 = this.inView.getUint32(12, false) ^ this.roundkey[3];
      const temp0 = this.inView.getUint32(0, false);
      const temp1 = this.inView.getUint32(4, false);
      const temp2 = this.inView.getUint32(8, false);
      const temp3 = this.inView.getUint32(12, false);
      let t0, t1, t22, t3;
      for (let round = 1; round < 10; round++) {
        const offset = round * 4;
        t0 = Td0[s0 >>> 24] ^ Td1[s3 >>> 16 & 255] ^ Td2[s22 >>> 8 & 255] ^ Td3[s1 & 255] ^ this.roundkey[offset];
        t1 = Td0[s1 >>> 24] ^ Td1[s0 >>> 16 & 255] ^ Td2[s3 >>> 8 & 255] ^ Td3[s22 & 255] ^ this.roundkey[offset + 1];
        t22 = Td0[s22 >>> 24] ^ Td1[s1 >>> 16 & 255] ^ Td2[s0 >>> 8 & 255] ^ Td3[s3 & 255] ^ this.roundkey[offset + 2];
        t3 = Td0[s3 >>> 24] ^ Td1[s22 >>> 16 & 255] ^ Td2[s1 >>> 8 & 255] ^ Td3[s0 & 255] ^ this.roundkey[offset + 3];
        s0 = t0;
        s1 = t1;
        s22 = t22;
        s3 = t3;
      }
      const f0 = Td4[s0 >>> 24 & 255] & 4278190080 ^ Td4[s3 >>> 16 & 255] & 16711680 ^ Td4[s22 >>> 8 & 255] & 65280 ^ Td4[s1 >>> 0 & 255] & 255 ^ this.roundkey[40];
      const f1 = Td4[s1 >>> 24 & 255] & 4278190080 ^ Td4[s0 >>> 16 & 255] & 16711680 ^ Td4[s3 >>> 8 & 255] & 65280 ^ Td4[s22 >>> 0 & 255] & 255 ^ this.roundkey[41];
      const f22 = Td4[s22 >>> 24 & 255] & 4278190080 ^ Td4[s1 >>> 16 & 255] & 16711680 ^ Td4[s0 >>> 8 & 255] & 65280 ^ Td4[s3 >>> 0 & 255] & 255 ^ this.roundkey[42];
      const f3 = Td4[s3 >>> 24 & 255] & 4278190080 ^ Td4[s22 >>> 16 & 255] & 16711680 ^ Td4[s1 >>> 8 & 255] & 65280 ^ Td4[s0 >>> 0 & 255] & 255 ^ this.roundkey[43];
      this.outView.setUint32(0, f0 ^ this.iv[0], false);
      this.outView.setUint32(4, f1 ^ this.iv[1], false);
      this.outView.setUint32(8, f22 ^ this.iv[2], false);
      this.outView.setUint32(12, f3 ^ this.iv[3], false);
      this.iv[0] = temp0;
      this.iv[1] = temp1;
      this.iv[2] = temp2;
      this.iv[3] = temp3;
    }
  };

  // node_modules/mediabunny/dist/modules/src/isobmff/isobmff-demuxer.js
  var IsobmffDemuxer = class _IsobmffDemuxer extends Demuxer {
    constructor(input) {
      super(input);
      this.moovSlice = null;
      this.currentTrack = null;
      this.tracks = [];
      this.metadataPromise = null;
      this.movieTimescale = -1;
      this.movieDurationInTimescale = -1;
      this.movieMatrix = IDENTITY_MATRIX;
      this.isQuickTime = false;
      this.metadataTags = {};
      this.currentMetadataKeys = null;
      this.isFragmented = false;
      this.fragmentTrackDefaults = [];
      this.psshBoxes = [];
      this.currentFragment = null;
      this.lastReadFragment = null;
      this.decryptionKeyCache = /* @__PURE__ */ new Map();
      this.reader = input._reader;
    }
    async getTrackBackings() {
      await this.readMetadata();
      return this.tracks.map((track) => track.trackBacking);
    }
    async getMimeType() {
      await this.readMetadata();
      const backings = await this.getTrackBackings();
      const codecStrings = await Promise.all(backings.map((x2) => x2.getDecoderConfig().then((c3) => c3?.codec ?? null)));
      return buildIsobmffMimeType({
        isQuickTime: this.isQuickTime,
        hasVideo: this.tracks.some((x2) => x2.info?.type === "video"),
        hasAudio: this.tracks.some((x2) => x2.info?.type === "audio"),
        codecStrings: codecStrings.filter(Boolean)
      });
    }
    async getMetadataTags() {
      await this.readMetadata();
      return this.metadataTags;
    }
    readMetadata() {
      return this.metadataPromise ??= (async () => {
        let currentPos = 0;
        let lookForMfraBox = false;
        let foundMovieBoxes = false;
        while (true) {
          let slice = this.reader.requestSliceRange(currentPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
          if (isThenable(slice))
            slice = await slice;
          if (!slice)
            break;
          const startPos = currentPos;
          const boxInfo = readBoxHeader(slice);
          if (!boxInfo) {
            break;
          }
          if (boxInfo.name === "ftyp" || boxInfo.name === "styp") {
            const majorBrand = readAscii(slice, 4);
            this.isQuickTime = majorBrand === "qt  ";
          } else if (boxInfo.name === "moov") {
            let moovSlice = this.reader.requestSlice(slice.filePos, boxInfo.contentSize);
            if (isThenable(moovSlice))
              moovSlice = await moovSlice;
            if (!moovSlice)
              break;
            this.moovSlice = moovSlice;
            this.readContiguousBoxes(this.moovSlice);
            for (const track of this.tracks) {
              const previousSegmentDurationsInSeconds = track.editListPreviousSegmentDurations / this.movieTimescale;
              track.editListOffset -= Math.round(previousSegmentDurationsInSeconds * track.timescale);
            }
            lookForMfraBox = this.isFragmented && this.reader.fileSize !== null && this.reader.fileSize > startPos + boxInfo.totalSize;
            foundMovieBoxes = true;
            break;
          } else if (boxInfo.name === "moof") {
            if (!this.input._initInput) {
              throw new Error('"moof" box encountered with no "moov" box present; this file is likely a Segment as described in ISO/IEC 14496-12 Section 8.16. A separate init file that contains a "moov" box is required to read this file, please provide it using InputOptions.initInput.');
            }
            await this.copyMetadataFromInitInput(this.input._initInput);
            lookForMfraBox = false;
            foundMovieBoxes = true;
            break;
          }
          currentPos = startPos + boxInfo.totalSize;
        }
        if (!foundMovieBoxes && this.input._initInput) {
          await this.copyMetadataFromInitInput(this.input._initInput);
        }
        if (lookForMfraBox) {
          assert(this.reader.fileSize !== null);
          let lastWordSlice = this.reader.requestSlice(this.reader.fileSize - 4, 4);
          if (isThenable(lastWordSlice))
            lastWordSlice = await lastWordSlice;
          assert(lastWordSlice);
          const lastWord = readU32Be(lastWordSlice);
          const potentialMfraPos = this.reader.fileSize - lastWord;
          if (potentialMfraPos >= 0 && potentialMfraPos <= this.reader.fileSize - MAX_BOX_HEADER_SIZE) {
            let mfraHeaderSlice = this.reader.requestSliceRange(potentialMfraPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
            if (isThenable(mfraHeaderSlice))
              mfraHeaderSlice = await mfraHeaderSlice;
            if (mfraHeaderSlice) {
              const boxInfo = readBoxHeader(mfraHeaderSlice);
              if (boxInfo && boxInfo.name === "mfra") {
                let mfraSlice = this.reader.requestSlice(mfraHeaderSlice.filePos, boxInfo.contentSize);
                if (isThenable(mfraSlice))
                  mfraSlice = await mfraSlice;
                if (mfraSlice) {
                  this.readContiguousBoxes(mfraSlice);
                }
              }
            }
          }
        }
      })();
    }
    async copyMetadataFromInitInput(initInput) {
      const initDemuxer = await initInput._getDemuxer();
      if (initDemuxer.constructor !== _IsobmffDemuxer) {
        throw new Error("Init input must match the input's format.");
      }
      await initDemuxer.readMetadata();
      this.movieTimescale = initDemuxer.movieTimescale;
      this.movieDurationInTimescale = initDemuxer.movieDurationInTimescale;
      this.movieMatrix = initDemuxer.movieMatrix;
      this.metadataTags = initDemuxer.metadataTags;
      this.isFragmented = true;
      this.fragmentTrackDefaults = initDemuxer.fragmentTrackDefaults;
      this.psshBoxes = initDemuxer.psshBoxes;
      for (const foreignTrack of initDemuxer.tracks) {
        const track = {
          id: foreignTrack.id,
          demuxer: this,
          trackBacking: null,
          disposition: foreignTrack.disposition,
          timescale: foreignTrack.timescale,
          durationInMediaTimescale: foreignTrack.durationInMediaTimescale,
          durationInMovieTimescale: foreignTrack.durationInMovieTimescale,
          matrix: foreignTrack.matrix,
          internalCodecId: foreignTrack.internalCodecId,
          name: foreignTrack.name,
          languageCode: foreignTrack.languageCode,
          sampleTableByteOffset: null,
          sampleTable: null,
          fragmentLookupTable: [],
          currentFragmentState: null,
          fragmentPositionCache: [],
          editListPreviousSegmentDurations: foreignTrack.editListPreviousSegmentDurations,
          editListOffset: foreignTrack.editListOffset,
          encryptionInfo: foreignTrack.encryptionInfo,
          encryptionAuxInfo: null,
          frmaCodecString: null,
          maxBitrate: foreignTrack.maxBitrate,
          avgBitrate: foreignTrack.avgBitrate,
          info: foreignTrack.info
        };
        if (foreignTrack.trackBacking) {
          assert(track.info);
          if (track.info.type === "video" && track.info.width !== -1) {
            const videoTrack = track;
            track.trackBacking = new IsobmffVideoTrackBacking(videoTrack);
            this.tracks.push(track);
          } else if (track.info.type === "audio" && track.info.numberOfChannels !== -1) {
            const audioTrack = track;
            track.trackBacking = new IsobmffAudioTrackBacking(audioTrack);
            this.tracks.push(track);
          }
        } else {
        }
      }
    }
    getSampleTableForTrack(internalTrack) {
      if (internalTrack.sampleTable) {
        return internalTrack.sampleTable;
      }
      const sampleTable = {
        sampleTimingEntries: [],
        sampleCompositionTimeOffsets: [],
        sampleSizes: [],
        keySampleIndices: null,
        chunkOffsets: [],
        sampleToChunk: [],
        presentationTimestamps: null,
        presentationTimestampIndexMap: null
      };
      internalTrack.sampleTable = sampleTable;
      if (internalTrack.sampleTableByteOffset === null) {
        return sampleTable;
      }
      assert(this.moovSlice);
      const stblContainerSlice = this.moovSlice.slice(internalTrack.sampleTableByteOffset);
      this.currentTrack = internalTrack;
      this.traverseBox(stblContainerSlice);
      this.currentTrack = null;
      const isPcmCodec = internalTrack.info?.type === "audio" && internalTrack.info.codec && PCM_AUDIO_CODECS.includes(internalTrack.info.codec);
      if (isPcmCodec && sampleTable.sampleCompositionTimeOffsets.length === 0) {
        assert(internalTrack.info?.type === "audio");
        const pcmInfo = parsePcmCodec(internalTrack.info.codec);
        const newSampleTimingEntries = [];
        const newSampleSizes = [];
        for (let i3 = 0; i3 < sampleTable.sampleToChunk.length; i3++) {
          const chunkEntry = sampleTable.sampleToChunk[i3];
          const nextEntry = sampleTable.sampleToChunk[i3 + 1];
          const chunkCount = (nextEntry ? nextEntry.startChunkIndex : sampleTable.chunkOffsets.length) - chunkEntry.startChunkIndex;
          for (let j3 = 0; j3 < chunkCount; j3++) {
            const startSampleIndex = chunkEntry.startSampleIndex + j3 * chunkEntry.samplesPerChunk;
            const endSampleIndex = startSampleIndex + chunkEntry.samplesPerChunk;
            const startTimingEntryIndex = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, startSampleIndex, (x2) => x2.startIndex);
            const startTimingEntry = sampleTable.sampleTimingEntries[startTimingEntryIndex];
            const endTimingEntryIndex = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, endSampleIndex, (x2) => x2.startIndex);
            const endTimingEntry = sampleTable.sampleTimingEntries[endTimingEntryIndex];
            const firstSampleTimestamp = startTimingEntry.startDecodeTimestamp + (startSampleIndex - startTimingEntry.startIndex) * startTimingEntry.delta;
            const lastSampleTimestamp = endTimingEntry.startDecodeTimestamp + (endSampleIndex - endTimingEntry.startIndex) * endTimingEntry.delta;
            const delta = lastSampleTimestamp - firstSampleTimestamp;
            const lastSampleTimingEntry = last(newSampleTimingEntries);
            if (lastSampleTimingEntry && lastSampleTimingEntry.delta === delta) {
              lastSampleTimingEntry.count++;
            } else {
              newSampleTimingEntries.push({
                startIndex: chunkEntry.startChunkIndex + j3,
                startDecodeTimestamp: firstSampleTimestamp,
                count: 1,
                delta
              });
            }
            const chunkSize = chunkEntry.samplesPerChunk * pcmInfo.sampleSize * internalTrack.info.numberOfChannels;
            newSampleSizes.push(chunkSize);
          }
          chunkEntry.startSampleIndex = chunkEntry.startChunkIndex;
          chunkEntry.samplesPerChunk = 1;
        }
        sampleTable.sampleTimingEntries = newSampleTimingEntries;
        sampleTable.sampleSizes = newSampleSizes;
      }
      if (sampleTable.sampleCompositionTimeOffsets.length > 0) {
        sampleTable.presentationTimestamps = [];
        for (const entry of sampleTable.sampleTimingEntries) {
          for (let i3 = 0; i3 < entry.count; i3++) {
            sampleTable.presentationTimestamps.push({
              presentationTimestamp: entry.startDecodeTimestamp + i3 * entry.delta,
              sampleIndex: entry.startIndex + i3
            });
          }
        }
        for (const entry of sampleTable.sampleCompositionTimeOffsets) {
          for (let i3 = 0; i3 < entry.count; i3++) {
            const sampleIndex = entry.startIndex + i3;
            const sample = sampleTable.presentationTimestamps[sampleIndex];
            if (!sample) {
              continue;
            }
            sample.presentationTimestamp += entry.offset;
          }
        }
        sampleTable.presentationTimestamps.sort((a3, b2) => a3.presentationTimestamp - b2.presentationTimestamp);
        sampleTable.presentationTimestampIndexMap = Array(sampleTable.presentationTimestamps.length).fill(-1);
        for (let i3 = 0; i3 < sampleTable.presentationTimestamps.length; i3++) {
          sampleTable.presentationTimestampIndexMap[sampleTable.presentationTimestamps[i3].sampleIndex] = i3;
        }
      } else {
      }
      return sampleTable;
    }
    async readFragment(startPos) {
      if (this.lastReadFragment?.moofOffset === startPos) {
        return this.lastReadFragment;
      }
      let headerSlice = this.reader.requestSliceRange(startPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
      if (isThenable(headerSlice))
        headerSlice = await headerSlice;
      assert(headerSlice);
      const moofBoxInfo = readBoxHeader(headerSlice);
      assert(moofBoxInfo?.name === "moof");
      let entireSlice = this.reader.requestSlice(startPos, moofBoxInfo.totalSize);
      if (isThenable(entireSlice))
        entireSlice = await entireSlice;
      assert(entireSlice);
      this.traverseBox(entireSlice);
      const fragment = this.lastReadFragment;
      assert(fragment && fragment.moofOffset === startPos);
      for (const [, trackData] of fragment.trackData) {
        const track = trackData.track;
        const { fragmentPositionCache } = track;
        if (!trackData.startTimestampIsFinal) {
          const lookupEntry = track.fragmentLookupTable.find((x2) => x2.moofOffset === fragment.moofOffset);
          if (lookupEntry) {
            offsetFragmentTrackDataByTimestamp(trackData, lookupEntry.timestamp);
          } else {
            const lastCacheIndex = binarySearchLessOrEqual(fragmentPositionCache, fragment.moofOffset - 1, (x2) => x2.moofOffset);
            if (lastCacheIndex !== -1) {
              const lastCache = fragmentPositionCache[lastCacheIndex];
              offsetFragmentTrackDataByTimestamp(trackData, lastCache.endTimestamp);
            } else {
            }
          }
          trackData.startTimestampIsFinal = true;
        }
        const insertionIndex = binarySearchLessOrEqual(fragmentPositionCache, trackData.startTimestamp, (x2) => x2.startTimestamp);
        if (insertionIndex === -1 || fragmentPositionCache[insertionIndex].moofOffset !== fragment.moofOffset) {
          fragmentPositionCache.splice(insertionIndex + 1, 0, {
            moofOffset: fragment.moofOffset,
            startTimestamp: trackData.startTimestamp,
            endTimestamp: trackData.endTimestamp
          });
        }
        if (trackData.encryptionAuxInfo && track.encryptionInfo) {
          const entries = await resolveEncryptionAuxInfo(this.reader, track.encryptionInfo, trackData.encryptionAuxInfo);
          for (let i3 = 0; i3 < Math.min(trackData.samples.length, entries.length); i3++) {
            const entry = entries[i3];
            trackData.samples[i3].encryption = entry;
          }
        }
      }
      return fragment;
    }
    readContiguousBoxes(slice) {
      const startIndex = slice.filePos;
      while (slice.filePos - startIndex <= slice.length - MIN_BOX_HEADER_SIZE) {
        const foundBox = this.traverseBox(slice);
        if (!foundBox) {
          break;
        }
      }
    }
    // eslint-disable-next-line @stylistic/generator-star-spacing
    *iterateContiguousBoxes(slice) {
      const startIndex = slice.filePos;
      while (slice.filePos - startIndex <= slice.length - MIN_BOX_HEADER_SIZE) {
        const startPos = slice.filePos;
        const boxInfo = readBoxHeader(slice);
        if (!boxInfo) {
          break;
        }
        yield { boxInfo, slice };
        slice.filePos = startPos + boxInfo.totalSize;
      }
    }
    traverseBox(slice) {
      const startPos = slice.filePos;
      const boxInfo = readBoxHeader(slice);
      if (!boxInfo) {
        return false;
      }
      const contentStartPos = slice.filePos;
      const boxEndPos = startPos + boxInfo.totalSize;
      switch (boxInfo.name) {
        case "mdia":
        case "minf":
        case "dinf":
        case "mfra":
        case "edts":
        case "sinf":
        case "schi":
          {
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          }
          ;
          break;
        case "mvhd":
          {
            const version = readU8(slice);
            slice.skip(3);
            if (version === 1) {
              slice.skip(8 + 8);
              this.movieTimescale = readU32Be(slice);
              this.movieDurationInTimescale = readU64Be(slice);
            } else {
              slice.skip(4 + 4);
              this.movieTimescale = readU32Be(slice);
              this.movieDurationInTimescale = readU32Be(slice);
            }
            slice.skip(4 + 2 + 2 + 2 * 4);
            this.movieMatrix = readMatrix(slice);
          }
          ;
          break;
        case "trak":
          {
            const track = {
              id: -1,
              demuxer: this,
              trackBacking: null,
              disposition: {
                ...DEFAULT_TRACK_DISPOSITION,
                primary: false
              },
              info: null,
              timescale: -1,
              durationInMovieTimescale: -1,
              durationInMediaTimescale: -1,
              matrix: IDENTITY_MATRIX,
              internalCodecId: null,
              name: null,
              languageCode: UNDETERMINED_LANGUAGE,
              sampleTableByteOffset: -1,
              sampleTable: null,
              fragmentLookupTable: [],
              currentFragmentState: null,
              fragmentPositionCache: [],
              editListPreviousSegmentDurations: 0,
              editListOffset: 0,
              encryptionInfo: null,
              encryptionAuxInfo: null,
              frmaCodecString: null,
              maxBitrate: null,
              avgBitrate: null
            };
            this.currentTrack = track;
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
            if (track.id !== -1 && track.timescale !== -1 && track.info !== null) {
              if (track.info.type === "video" && track.info.width !== -1) {
                const videoTrack = track;
                track.trackBacking = new IsobmffVideoTrackBacking(videoTrack);
                this.tracks.push(track);
              } else if (track.info.type === "audio" && track.info.numberOfChannels !== -1) {
                const audioTrack = track;
                track.trackBacking = new IsobmffAudioTrackBacking(audioTrack);
                this.tracks.push(track);
              }
            }
            this.currentTrack = null;
          }
          ;
          break;
        case "tkhd":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            const version = readU8(slice);
            const flags = readU24Be(slice);
            const trackEnabled = !!(flags & 1);
            track.disposition.default = trackEnabled;
            if (version === 0) {
              slice.skip(8);
              track.id = readU32Be(slice);
              slice.skip(4);
              track.durationInMovieTimescale = readU32Be(slice);
            } else if (version === 1) {
              slice.skip(16);
              track.id = readU32Be(slice);
              slice.skip(4);
              track.durationInMovieTimescale = readU64Be(slice);
            } else {
              throw new Error(`Incorrect track header version ${version}.`);
            }
            slice.skip(2 * 4 + 2 + 2 + 2 + 2);
            const trackMatrix = readMatrix(slice);
            track.matrix = multiplyMatrices(trackMatrix, this.movieMatrix);
          }
          ;
          break;
        case "elst":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            const version = readU8(slice);
            slice.skip(3);
            let relevantEntryFound = false;
            let previousSegmentDurations = 0;
            const entryCount = readU32Be(slice);
            for (let i3 = 0; i3 < entryCount; i3++) {
              const segmentDuration = version === 1 ? readU64Be(slice) : readU32Be(slice);
              const mediaTime = version === 1 ? readI64Be(slice) : readI32Be(slice);
              const mediaRate = readFixed_16_16(slice);
              if (relevantEntryFound) {
                Logging._warn("Unsupported edit list: multiple edits are not currently supported. Only using first edit.");
                break;
              }
              if (mediaTime === -1) {
                previousSegmentDurations += segmentDuration;
                continue;
              }
              if (mediaRate !== 1) {
                Logging._warn("Unsupported edit list entry: media rate must be 1.");
                break;
              }
              track.editListPreviousSegmentDurations = previousSegmentDurations;
              track.editListOffset = mediaTime;
              relevantEntryFound = true;
            }
          }
          ;
          break;
        case "mdhd":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            const version = readU8(slice);
            slice.skip(3);
            if (version === 0) {
              slice.skip(8);
              track.timescale = readU32Be(slice);
              track.durationInMediaTimescale = readU32Be(slice);
            } else if (version === 1) {
              slice.skip(16);
              track.timescale = readU32Be(slice);
              track.durationInMediaTimescale = readU64Be(slice);
            }
            let language = readU16Be(slice);
            if (language > 0) {
              track.languageCode = "";
              for (let i3 = 0; i3 < 3; i3++) {
                track.languageCode = String.fromCharCode(96 + (language & 31)) + track.languageCode;
                language >>= 5;
              }
              if (!isIso639Dash2LanguageCode(track.languageCode)) {
                track.languageCode = UNDETERMINED_LANGUAGE;
              }
            }
          }
          ;
          break;
        case "hdlr":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            slice.skip(8);
            const handlerType = readAscii(slice, 4);
            if (handlerType === "vide") {
              track.info = {
                type: "video",
                width: -1,
                height: -1,
                squarePixelWidth: -1,
                squarePixelHeight: -1,
                codec: null,
                codecDescription: null,
                colorSpace: { ...EMPTY_COLOR_SPACE },
                avcType: null,
                avcCodecInfo: null,
                hevcCodecInfo: null,
                vp9CodecInfo: null,
                av1CodecInfo: null,
                proresCodecInfo: null,
                proresFormat: null
              };
            } else if (handlerType === "soun") {
              track.info = {
                type: "audio",
                numberOfChannels: -1,
                sampleRate: -1,
                codec: null,
                codecDescription: null,
                aacCodecInfo: null,
                dtsFormat: null,
                pcmLittleEndian: false,
                pcmSampleSize: null
              };
            }
          }
          ;
          break;
        case "stbl":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            track.sampleTableByteOffset = startPos;
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          }
          ;
          break;
        case "stsd":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (track.info === null || track.sampleTable) {
              break;
            }
            const stsdVersion = readU8(slice);
            slice.skip(3);
            const entries = readU32Be(slice);
            for (let i3 = 0; i3 < entries; i3++) {
              const sampleBoxStartPos = slice.filePos;
              const sampleBoxInfo = readBoxHeader(slice);
              if (!sampleBoxInfo) {
                break;
              }
              track.internalCodecId = sampleBoxInfo.name;
              const lowercaseBoxName = sampleBoxInfo.name.toLowerCase();
              if (track.info.type === "video") {
                slice.skip(6 * 1 + 2 + 2 + 2 + 3 * 4);
                track.info.width = readU16Be(slice);
                track.info.height = readU16Be(slice);
                track.info.squarePixelWidth = track.info.width;
                track.info.squarePixelHeight = track.info.height;
                slice.skip(4 + 4 + 4 + 2 + 32 + 2 + 2);
                track.frmaCodecString = null;
                this.readContiguousBoxes(slice.slice(slice.filePos, sampleBoxStartPos + sampleBoxInfo.totalSize - slice.filePos));
                const codecName = lowercaseBoxName === "encv" ? track.frmaCodecString : lowercaseBoxName;
                track.frmaCodecString = null;
                if (codecName === "avc1" || codecName === "avc3") {
                  track.info.codec = "avc";
                  track.info.avcType = codecName === "avc1" ? 1 : 3;
                } else if (codecName === "hvc1" || codecName === "hev1") {
                  track.info.codec = "hevc";
                } else if (codecName === "vp08") {
                  track.info.codec = "vp8";
                } else if (codecName === "vp09") {
                  track.info.codec = "vp9";
                } else if (codecName === "av01") {
                  track.info.codec = "av1";
                } else if (PRORES_FOURCCS.includes(lowercaseBoxName)) {
                  track.info.codec = "prores";
                  track.info.proresFormat = lowercaseBoxName;
                } else if (codecName === null) {
                  Logging._warn(`Unknown encrypted video codec due to missing frma box.`);
                } else {
                  Logging._warn(`Unsupported video codec (sample entry type '${sampleBoxInfo.name}').`);
                }
              } else {
                slice.skip(6 * 1 + 2);
                const version = readU16Be(slice);
                slice.skip(3 * 2);
                let channelCount = readU16Be(slice);
                let sampleSize = readU16Be(slice);
                slice.skip(2 * 2);
                let sampleRate = readU32Be(slice) / 65536;
                let lpcmFlags = null;
                if (stsdVersion === 0 && version > 0) {
                  if (version === 1) {
                    slice.skip(4);
                    sampleSize = 8 * readU32Be(slice);
                    slice.skip(2 * 4);
                  } else if (version === 2) {
                    slice.skip(4);
                    sampleRate = readF64Be(slice);
                    channelCount = readU32Be(slice);
                    slice.skip(4);
                    sampleSize = readU32Be(slice);
                    lpcmFlags = readU32Be(slice);
                    slice.skip(2 * 4);
                  }
                }
                track.info.numberOfChannels = channelCount;
                track.info.sampleRate = sampleRate;
                track.frmaCodecString = null;
                this.readContiguousBoxes(slice.slice(slice.filePos, sampleBoxStartPos + sampleBoxInfo.totalSize - slice.filePos));
                const codecName = lowercaseBoxName === "enca" ? track.frmaCodecString : lowercaseBoxName;
                track.frmaCodecString = null;
                if (codecName === "mp4a") {
                } else if (codecName === "opus") {
                  track.info.codec = "opus";
                  track.info.sampleRate = OPUS_SAMPLE_RATE;
                } else if (codecName === "flac") {
                  track.info.codec = "flac";
                } else if (codecName === "ulaw") {
                  track.info.codec = "ulaw";
                } else if (codecName === "alaw") {
                  track.info.codec = "alaw";
                } else if (codecName === "ac-3") {
                  track.info.codec = "ac3";
                } else if (codecName === "ec-3") {
                  track.info.codec = "eac3";
                } else if (DTS_FOURCCS.includes(codecName)) {
                  track.info.codec = "dts";
                  track.info.dtsFormat = codecName;
                } else if (codecName === "twos") {
                  if (sampleSize === 8) {
                    track.info.codec = "pcm-s8";
                  } else if (sampleSize === 16) {
                    track.info.codec = track.info.pcmLittleEndian ? "pcm-s16" : "pcm-s16be";
                  } else {
                    Logging._warn(`Unsupported sample size ${sampleSize} for codec 'twos'.`);
                    track.info.codec = null;
                  }
                } else if (codecName === "sowt") {
                  if (sampleSize === 8) {
                    track.info.codec = "pcm-s8";
                  } else if (sampleSize === 16) {
                    track.info.codec = "pcm-s16";
                  } else {
                    Logging._warn(`Unsupported sample size ${sampleSize} for codec 'sowt'.`);
                    track.info.codec = null;
                  }
                } else if (codecName === "raw ") {
                  track.info.codec = "pcm-u8";
                } else if (codecName === "in24") {
                  track.info.codec = track.info.pcmLittleEndian ? "pcm-s24" : "pcm-s24be";
                } else if (codecName === "in32") {
                  track.info.codec = track.info.pcmLittleEndian ? "pcm-s32" : "pcm-s32be";
                } else if (codecName === "fl32") {
                  track.info.codec = track.info.pcmLittleEndian ? "pcm-f32" : "pcm-f32be";
                } else if (codecName === "fl64") {
                  track.info.codec = track.info.pcmLittleEndian ? "pcm-f64" : "pcm-f64be";
                } else if (codecName === "ipcm") {
                  const pcmSampleSize = track.info.pcmSampleSize;
                  if (track.info.pcmLittleEndian) {
                    if (pcmSampleSize === 16) {
                      track.info.codec = "pcm-s16";
                    } else if (pcmSampleSize === 24) {
                      track.info.codec = "pcm-s24";
                    } else if (pcmSampleSize === 32) {
                      track.info.codec = "pcm-s32";
                    } else {
                      Logging._warn(`Invalid ipcm sample size ${pcmSampleSize}.`);
                      track.info.codec = null;
                    }
                  } else {
                    if (pcmSampleSize === 16) {
                      track.info.codec = "pcm-s16be";
                    } else if (pcmSampleSize === 24) {
                      track.info.codec = "pcm-s24be";
                    } else if (pcmSampleSize === 32) {
                      track.info.codec = "pcm-s32be";
                    } else {
                      Logging._warn(`Invalid ipcm sample size ${pcmSampleSize}.`);
                      track.info.codec = null;
                    }
                  }
                } else if (codecName === "fpcm") {
                  const pcmSampleSize = track.info.pcmSampleSize;
                  if (track.info.pcmLittleEndian) {
                    if (pcmSampleSize === 32) {
                      track.info.codec = "pcm-f32";
                    } else if (pcmSampleSize === 64) {
                      track.info.codec = "pcm-f64";
                    } else {
                      Logging._warn(`Invalid fpcm sample size ${pcmSampleSize}.`);
                      track.info.codec = null;
                    }
                  } else {
                    if (pcmSampleSize === 32) {
                      track.info.codec = "pcm-f32be";
                    } else if (pcmSampleSize === 64) {
                      track.info.codec = "pcm-f64be";
                    } else {
                      Logging._warn(`Invalid fpcm sample size ${pcmSampleSize}.`);
                      track.info.codec = null;
                    }
                  }
                } else if (codecName === "lpcm" && lpcmFlags !== null) {
                  const bytesPerSample = sampleSize + 7 >> 3;
                  const isFloat = Boolean(lpcmFlags & 1);
                  const isBigEndian = Boolean(lpcmFlags & 2);
                  const sFlags = lpcmFlags & 4 ? -1 : 0;
                  if (sampleSize > 0 && sampleSize <= 64) {
                    if (isFloat) {
                      if (sampleSize === 32) {
                        track.info.codec = isBigEndian ? "pcm-f32be" : "pcm-f32";
                      }
                    } else {
                      if (sFlags & 1 << bytesPerSample - 1) {
                        if (bytesPerSample === 1) {
                          track.info.codec = "pcm-s8";
                        } else if (bytesPerSample === 2) {
                          track.info.codec = isBigEndian ? "pcm-s16be" : "pcm-s16";
                        } else if (bytesPerSample === 3) {
                          track.info.codec = isBigEndian ? "pcm-s24be" : "pcm-s24";
                        } else if (bytesPerSample === 4) {
                          track.info.codec = isBigEndian ? "pcm-s32be" : "pcm-s32";
                        }
                      } else {
                        if (bytesPerSample === 1) {
                          track.info.codec = "pcm-u8";
                        }
                      }
                    }
                  }
                  if (track.info.codec === null) {
                    Logging._warn("Unsupported PCM format.");
                  }
                } else if (codecName === null) {
                  Logging._warn(`Unknown encrypted audio codec due to missing frma box.`);
                } else {
                  Logging._warn(`Unsupported audio codec (sample entry type '${sampleBoxInfo.name}').`);
                }
              }
              slice.filePos = sampleBoxStartPos + sampleBoxInfo.totalSize;
            }
          }
          ;
          break;
        case "frma":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            const format = readAscii(slice, 4);
            const lowercase = format.toLowerCase();
            track.frmaCodecString = lowercase;
          }
          ;
          break;
        case "schm":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            slice.skip(4);
            const schemeType = readAscii(slice, 4);
            if (schemeType === "cenc" || schemeType === "cens" || schemeType === "cbcs") {
              track.encryptionInfo = {
                scheme: schemeType,
                defaultKid: null,
                defaultIsProtected: null,
                defaultPerSampleIvSize: null,
                defaultConstantIv: null,
                defaultCryptByteBlock: null,
                defaultSkipByteBlock: null
              };
            } else {
              Logging._warn(`Unsupported encryption scheme '${schemeType}'.`);
            }
          }
          ;
          break;
        case "tenc":
          {
            const track = this.currentTrack;
            if (!track || !track.encryptionInfo) {
              break;
            }
            const version = readU8(slice);
            slice.skip(3);
            slice.skip(1);
            const patternByte = readU8(slice);
            if (version > 0) {
              track.encryptionInfo.defaultCryptByteBlock = patternByte >> 4;
              track.encryptionInfo.defaultSkipByteBlock = patternByte & 15;
            } else {
              track.encryptionInfo.defaultCryptByteBlock = 0;
              track.encryptionInfo.defaultSkipByteBlock = 0;
            }
            track.encryptionInfo.defaultIsProtected = readU8(slice) !== 0;
            track.encryptionInfo.defaultPerSampleIvSize = readU8(slice);
            track.encryptionInfo.defaultKid = bytesToHexString(readBytes(slice, 16));
            if (track.encryptionInfo.defaultIsProtected && track.encryptionInfo.defaultPerSampleIvSize === 0) {
              const constantIvSize = readU8(slice);
              const constantIv = new Uint8Array(16);
              constantIv.set(readBytes(slice, constantIvSize), 0);
              track.encryptionInfo.defaultConstantIv = constantIv;
            }
          }
          ;
          break;
        case "avcC":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info);
            if (boxInfo.contentSize === 0) {
              break;
            }
            track.info.codecDescription = readBytes(slice, boxInfo.contentSize);
            const sps = deserializeAvcDecoderConfigurationRecord(track.info.codecDescription)?.sequenceParameterSets[0];
            const spsInfo = sps && parseAvcSps(sps);
            if (spsInfo) {
              applySpsPixelAspectRatio(track, spsInfo.pixelAspectRatio);
            }
          }
          ;
          break;
        case "hvcC":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info);
            if (boxInfo.contentSize === 0) {
              break;
            }
            track.info.codecDescription = readBytes(slice, boxInfo.contentSize);
            const sps = deserializeHevcDecoderConfigurationRecord(track.info.codecDescription)?.arrays.find((x2) => x2.nalUnitType === HevcNalUnitType.SPS_NUT)?.nalUnits[0];
            const spsInfo = sps && parseHevcSps(sps);
            if (spsInfo) {
              applySpsPixelAspectRatio(track, spsInfo.pixelAspectRatio);
            }
          }
          ;
          break;
        case "vpcC":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "video");
            slice.skip(4);
            const profile = readU8(slice);
            const level = readU8(slice);
            const thirdByte = readU8(slice);
            const bitDepth = thirdByte >> 4;
            const chromaSubsampling = thirdByte >> 1 & 7;
            const videoFullRangeFlag = thirdByte & 1;
            const colourPrimaries = readU8(slice);
            const transferCharacteristics = readU8(slice);
            const matrixCoefficients = readU8(slice);
            track.info.vp9CodecInfo = {
              profile,
              level,
              bitDepth,
              chromaSubsampling,
              videoFullRangeFlag,
              colourPrimaries,
              transferCharacteristics,
              matrixCoefficients
            };
          }
          ;
          break;
        case "av1C":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "video");
            slice.skip(1);
            const secondByte = readU8(slice);
            const profile = secondByte >> 5;
            const level = secondByte & 31;
            const thirdByte = readU8(slice);
            const tier = thirdByte >> 7;
            const highBitDepth = thirdByte >> 6 & 1;
            const twelveBit = thirdByte >> 5 & 1;
            const monochrome = thirdByte >> 4 & 1;
            const chromaSubsamplingX = thirdByte >> 3 & 1;
            const chromaSubsamplingY = thirdByte >> 2 & 1;
            const chromaSamplePosition = thirdByte & 3;
            const bitDepth = profile === 2 && highBitDepth ? twelveBit ? 12 : 10 : highBitDepth ? 10 : 8;
            slice.skip(1);
            const configObus = readBytes(slice, boxInfo.contentSize - 4);
            const configObuInfo = extractAv1CodecInfoFromPacket(configObus);
            track.info.av1CodecInfo = {
              profile,
              level,
              tier,
              bitDepth,
              monochrome,
              chromaSubsamplingX,
              chromaSubsamplingY,
              chromaSamplePosition,
              videoFullRangeFlag: configObuInfo?.videoFullRangeFlag ?? 0,
              colourPrimaries: configObuInfo?.colourPrimaries ?? 2,
              transferCharacteristics: configObuInfo?.transferCharacteristics ?? 2,
              matrixCoefficients: configObuInfo?.matrixCoefficients ?? 2
            };
          }
          ;
          break;
        case "colr":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "video");
            const colourType = readAscii(slice, 4);
            if (colourType !== "nclx" && colourType !== "nclc") {
              break;
            }
            const colourPrimaries = readU16Be(slice);
            const transferCharacteristics = readU16Be(slice);
            const matrixCoefficients = readU16Be(slice);
            let fullRange = void 0;
            if (colourType === "nclx") {
              fullRange = Boolean(readU8(slice) & 128);
            }
            track.info.colorSpace = {
              primaries: COLOR_PRIMARIES_MAP_INVERSE[colourPrimaries],
              transfer: TRANSFER_CHARACTERISTICS_MAP_INVERSE[transferCharacteristics],
              matrix: MATRIX_COEFFICIENTS_MAP_INVERSE[matrixCoefficients],
              fullRange
            };
          }
          ;
          break;
        case "pasp":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "video");
            const num = readU32Be(slice);
            const den = readU32Be(slice);
            if (num > 0 && den > 0) {
              track.info.squarePixelWidth = track.info.width;
              track.info.squarePixelHeight = track.info.height;
              if (num > den) {
                track.info.squarePixelWidth = Math.round(track.info.width * num / den);
              } else {
                track.info.squarePixelHeight = Math.round(track.info.height * den / num);
              }
            }
          }
          ;
          break;
        case "btrt":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            slice.skip(4);
            const maxBitrate = readU32Be(slice);
            const avgBitrate = readU32Be(slice);
            track.maxBitrate = maxBitrate > 0 ? maxBitrate : null;
            track.avgBitrate = avgBitrate > 0 ? avgBitrate : null;
          }
          ;
          break;
        case "wave":
          {
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          }
          ;
          break;
        case "esds":
          {
            const track = this.currentTrack;
            if (!track || track.info?.type !== "audio") {
              break;
            }
            slice.skip(4);
            const { objectTypeIndication, decoderSpecificInfo } = readEsDescriptor(slice);
            if (objectTypeIndication === 64 || objectTypeIndication === 103) {
              track.info.codec = "aac";
              track.info.aacCodecInfo = {
                isMpeg2: objectTypeIndication === 103,
                objectType: null
              };
            } else if (objectTypeIndication === 105 || objectTypeIndication === 107) {
              track.info.codec = "mp3";
            } else if (objectTypeIndication === 221) {
              track.info.codec = "vorbis";
            } else if (objectTypeIndication === 169) {
              track.info.codec = "dts";
            } else {
              Logging._warn(`Unsupported audio codec (objectTypeIndication ${objectTypeIndication}) - discarding track.`);
            }
            if (decoderSpecificInfo) {
              track.info.codecDescription = decoderSpecificInfo;
              if (track.info.codec === "aac") {
                const audioSpecificConfig = parseAacAudioSpecificConfig(track.info.codecDescription);
                if (audioSpecificConfig.outputNumberOfChannels !== null) {
                  track.info.numberOfChannels = audioSpecificConfig.outputNumberOfChannels;
                }
                if (audioSpecificConfig.outputSampleRate !== null) {
                  track.info.sampleRate = audioSpecificConfig.outputSampleRate;
                }
              }
            }
          }
          ;
          break;
        case "enda":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "audio");
            track.info.pcmLittleEndian = !!(readU16Be(slice) & 255);
          }
          ;
          break;
        case "pcmC":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "audio");
            slice.skip(1 + 3);
            const formatFlags = readU8(slice);
            track.info.pcmLittleEndian = Boolean(formatFlags & 1);
            track.info.pcmSampleSize = readU8(slice);
          }
          ;
          break;
        case "dOps":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "audio");
            slice.skip(1);
            const outputChannelCount = readU8(slice);
            const preSkip = readU16Be(slice);
            const inputSampleRate = readU32Be(slice);
            const outputGain = readI16Be(slice);
            const channelMappingFamily = readU8(slice);
            let channelMappingTable;
            if (channelMappingFamily !== 0) {
              channelMappingTable = readBytes(slice, 2 + outputChannelCount);
            } else {
              channelMappingTable = new Uint8Array(0);
            }
            const description = new Uint8Array(8 + 1 + 1 + 2 + 4 + 2 + 1 + channelMappingTable.byteLength);
            const view = new DataView(description.buffer);
            view.setUint32(0, 1332770163, false);
            view.setUint32(4, 1214603620, false);
            view.setUint8(8, 1);
            view.setUint8(9, outputChannelCount);
            view.setUint16(10, preSkip, true);
            view.setUint32(12, inputSampleRate, true);
            view.setInt16(16, outputGain, true);
            view.setUint8(18, channelMappingFamily);
            description.set(channelMappingTable, 19);
            track.info.codecDescription = description;
            track.info.numberOfChannels = outputChannelCount;
          }
          ;
          break;
        case "dfLa":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "audio");
            slice.skip(4);
            const BLOCK_TYPE_MASK = 127;
            const LAST_METADATA_BLOCK_FLAG_MASK = 128;
            const startPos2 = slice.filePos;
            while (slice.filePos < boxEndPos) {
              const flagAndType = readU8(slice);
              const metadataBlockLength = readU24Be(slice);
              const type = flagAndType & BLOCK_TYPE_MASK;
              if (type === FlacBlockType.STREAMINFO) {
                slice.skip(10);
                const word = readU32Be(slice);
                const sampleRate = word >>> 12;
                const numberOfChannels = (word >> 9 & 7) + 1;
                track.info.sampleRate = sampleRate;
                track.info.numberOfChannels = numberOfChannels;
                slice.skip(20);
              } else {
                slice.skip(metadataBlockLength);
              }
              if (flagAndType & LAST_METADATA_BLOCK_FLAG_MASK) {
                break;
              }
            }
            const endPos = slice.filePos;
            slice.filePos = startPos2;
            const bytes = readBytes(slice, endPos - startPos2);
            const description = new Uint8Array(4 + bytes.byteLength);
            const view = new DataView(description.buffer);
            view.setUint32(0, 1716281667, false);
            description.set(bytes, 4);
            track.info.codecDescription = description;
          }
          ;
          break;
        case "dac3":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "audio");
            const bytes = readBytes(slice, 3);
            const bitstream = new Bitstream(bytes);
            const fscod = bitstream.readBits(2);
            bitstream.skipBits(5 + 3);
            const acmod = bitstream.readBits(3);
            const lfeon = bitstream.readBits(1);
            if (fscod < 3) {
              track.info.sampleRate = AC3_SAMPLE_RATES[fscod];
            }
            track.info.numberOfChannels = AC3_ACMOD_CHANNEL_COUNTS[acmod] + lfeon;
          }
          ;
          break;
        case "dec3":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "audio");
            const bytes = readBytes(slice, boxInfo.contentSize);
            const config = parseEac3Config(bytes);
            if (!config) {
              Logging._warn("Invalid dec3 box contents, ignoring.");
              break;
            }
            const sampleRate = getEac3SampleRate(config);
            if (sampleRate !== null) {
              track.info.sampleRate = sampleRate;
            }
            track.info.numberOfChannels = getEac3ChannelCount(config);
          }
          ;
          break;
        case "ddts":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.info?.type === "audio");
            const bytes = readBytes(slice, Math.min(boxInfo.contentSize, DTS_SPECIFIC_BOX_SIZE));
            const config = parseDtsSpecificBox(bytes);
            if (!config) {
              Logging._warn("Invalid ddts box contents, ignoring.");
              break;
            }
            track.info.sampleRate = config.sampleRate;
            if (config.numberOfChannels !== null) {
              track.info.numberOfChannels = config.numberOfChannels;
            }
          }
          ;
          break;
        case "stts":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(4);
            const entryCount = readU32Be(slice);
            let currentIndex = 0;
            let currentTimestamp = 0;
            for (let i3 = 0; i3 < entryCount; i3++) {
              const sampleCount = readU32Be(slice);
              const sampleDelta = readU32Be(slice);
              track.sampleTable.sampleTimingEntries.push({
                startIndex: currentIndex,
                startDecodeTimestamp: currentTimestamp,
                count: sampleCount,
                delta: sampleDelta
              });
              currentIndex += sampleCount;
              currentTimestamp += sampleCount * sampleDelta;
            }
          }
          ;
          break;
        case "ctts":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(1 + 3);
            const entryCount = readU32Be(slice);
            let sampleIndex = 0;
            for (let i3 = 0; i3 < entryCount; i3++) {
              const sampleCount = readU32Be(slice);
              const sampleOffset = readI32Be(slice);
              track.sampleTable.sampleCompositionTimeOffsets.push({
                startIndex: sampleIndex,
                count: sampleCount,
                offset: sampleOffset
              });
              sampleIndex += sampleCount;
            }
          }
          ;
          break;
        case "stsz":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(4);
            const sampleSize = readU32Be(slice);
            const sampleCount = readU32Be(slice);
            if (sampleSize === 0) {
              for (let i3 = 0; i3 < sampleCount; i3++) {
                const sampleSize2 = readU32Be(slice);
                track.sampleTable.sampleSizes.push(sampleSize2);
              }
            } else {
              track.sampleTable.sampleSizes.push(sampleSize);
            }
          }
          ;
          break;
        case "stz2":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(4);
            slice.skip(3);
            const fieldSize = readU8(slice);
            const sampleCount = readU32Be(slice);
            const bytes = readBytes(slice, Math.ceil(sampleCount * fieldSize / 8));
            const bitstream = new Bitstream(bytes);
            for (let i3 = 0; i3 < sampleCount; i3++) {
              const sampleSize = bitstream.readBits(fieldSize);
              track.sampleTable.sampleSizes.push(sampleSize);
            }
          }
          ;
          break;
        case "stss":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(4);
            track.sampleTable.keySampleIndices = [];
            const entryCount = readU32Be(slice);
            for (let i3 = 0; i3 < entryCount; i3++) {
              const sampleIndex = readU32Be(slice) - 1;
              track.sampleTable.keySampleIndices.push(sampleIndex);
            }
            if (track.sampleTable.keySampleIndices[0] !== 0) {
              track.sampleTable.keySampleIndices.unshift(0);
            }
          }
          ;
          break;
        case "stsc":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(4);
            const entryCount = readU32Be(slice);
            for (let i3 = 0; i3 < entryCount; i3++) {
              const startChunkIndex = readU32Be(slice) - 1;
              const samplesPerChunk = readU32Be(slice);
              const sampleDescriptionIndex = readU32Be(slice);
              track.sampleTable.sampleToChunk.push({
                startSampleIndex: -1,
                startChunkIndex,
                samplesPerChunk,
                sampleDescriptionIndex
              });
            }
            let startSampleIndex = 0;
            for (let i3 = 0; i3 < track.sampleTable.sampleToChunk.length; i3++) {
              track.sampleTable.sampleToChunk[i3].startSampleIndex = startSampleIndex;
              if (i3 < track.sampleTable.sampleToChunk.length - 1) {
                const nextChunk = track.sampleTable.sampleToChunk[i3 + 1];
                const chunkCount = nextChunk.startChunkIndex - track.sampleTable.sampleToChunk[i3].startChunkIndex;
                startSampleIndex += chunkCount * track.sampleTable.sampleToChunk[i3].samplesPerChunk;
              }
            }
          }
          ;
          break;
        case "stco":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(4);
            const entryCount = readU32Be(slice);
            for (let i3 = 0; i3 < entryCount; i3++) {
              const chunkOffset = readU32Be(slice);
              track.sampleTable.chunkOffsets.push(chunkOffset);
            }
          }
          ;
          break;
        case "co64":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            if (!track.sampleTable) {
              break;
            }
            slice.skip(4);
            const entryCount = readU32Be(slice);
            for (let i3 = 0; i3 < entryCount; i3++) {
              const chunkOffset = readU64Be(slice);
              track.sampleTable.chunkOffsets.push(chunkOffset);
            }
          }
          ;
          break;
        case "mvex":
          {
            this.isFragmented = true;
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
          }
          ;
          break;
        case "mehd":
          {
            const version = readU8(slice);
            slice.skip(3);
            const fragmentDuration = version === 1 ? readU64Be(slice) : readU32Be(slice);
            this.movieDurationInTimescale = fragmentDuration;
          }
          ;
          break;
        case "trex":
          {
            slice.skip(4);
            const trackId = readU32Be(slice);
            const defaultSampleDescriptionIndex = readU32Be(slice);
            const defaultSampleDuration = readU32Be(slice);
            const defaultSampleSize = readU32Be(slice);
            const defaultSampleFlags = readU32Be(slice);
            this.fragmentTrackDefaults.push({
              trackId,
              defaultSampleDescriptionIndex,
              defaultSampleDuration,
              defaultSampleSize,
              defaultSampleFlags
            });
          }
          ;
          break;
        case "tfra":
          {
            const version = readU8(slice);
            slice.skip(3);
            const trackId = readU32Be(slice);
            const track = this.tracks.find((x2) => x2.id === trackId);
            if (!track) {
              break;
            }
            const word = readU32Be(slice);
            const lengthSizeOfTrafNum = (word & 48) >> 4;
            const lengthSizeOfTrunNum = (word & 12) >> 2;
            const lengthSizeOfSampleNum = word & 3;
            const functions = [readU8, readU16Be, readU24Be, readU32Be];
            const readTrafNum = functions[lengthSizeOfTrafNum];
            const readTrunNum = functions[lengthSizeOfTrunNum];
            const readSampleNum = functions[lengthSizeOfSampleNum];
            const numberOfEntries = readU32Be(slice);
            for (let i3 = 0; i3 < numberOfEntries; i3++) {
              const time = version === 1 ? readU64Be(slice) : readU32Be(slice);
              const moofOffset = version === 1 ? readU64Be(slice) : readU32Be(slice);
              readTrafNum(slice);
              readTrunNum(slice);
              readSampleNum(slice);
              track.fragmentLookupTable.push({
                timestamp: time,
                moofOffset
              });
            }
            track.fragmentLookupTable.sort((a3, b2) => a3.timestamp - b2.timestamp);
            for (let i3 = 0; i3 < track.fragmentLookupTable.length - 1; i3++) {
              const entry1 = track.fragmentLookupTable[i3];
              const entry2 = track.fragmentLookupTable[i3 + 1];
              if (entry1.timestamp === entry2.timestamp) {
                track.fragmentLookupTable.splice(i3 + 1, 1);
                i3--;
              }
            }
          }
          ;
          break;
        case "moof":
          {
            this.currentFragment = {
              moofOffset: startPos,
              moofSize: boxInfo.totalSize,
              implicitBaseDataOffset: startPos,
              trackData: /* @__PURE__ */ new Map(),
              psshBoxes: []
            };
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
            this.lastReadFragment = this.currentFragment;
            this.currentFragment = null;
          }
          ;
          break;
        case "traf":
          {
            assert(this.currentFragment);
            this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
            if (this.currentTrack) {
              const trackData = this.currentFragment.trackData.get(this.currentTrack.id);
              cond: if (trackData) {
                if (trackData.samples.length === 0) {
                  this.currentFragment.trackData.delete(this.currentTrack.id);
                  break cond;
                }
                trackData.presentationTimestamps = trackData.samples.map((x2, i3) => ({ presentationTimestamp: x2.presentationTimestamp, sampleIndex: i3 })).sort((a3, b2) => a3.presentationTimestamp - b2.presentationTimestamp);
                for (let i3 = 0; i3 < trackData.presentationTimestamps.length; i3++) {
                  const currentEntry = trackData.presentationTimestamps[i3];
                  const currentSample = trackData.samples[currentEntry.sampleIndex];
                  if (trackData.firstKeyFrameTimestamp === null && currentSample.isKeyFrame) {
                    trackData.firstKeyFrameTimestamp = currentSample.presentationTimestamp;
                  }
                  if (i3 < trackData.presentationTimestamps.length - 1) {
                    const nextEntry = trackData.presentationTimestamps[i3 + 1];
                    const duration = nextEntry.presentationTimestamp - currentEntry.presentationTimestamp;
                    currentSample.duration = duration;
                  }
                }
                const firstSample = trackData.samples[trackData.presentationTimestamps[0].sampleIndex];
                const lastSample = trackData.samples[last(trackData.presentationTimestamps).sampleIndex];
                trackData.startTimestamp = firstSample.presentationTimestamp;
                trackData.endTimestamp = lastSample.presentationTimestamp + lastSample.duration;
                const { currentFragmentState } = this.currentTrack;
                assert(currentFragmentState);
                if (currentFragmentState.startTimestamp !== null) {
                  offsetFragmentTrackDataByTimestamp(trackData, currentFragmentState.startTimestamp);
                  trackData.startTimestampIsFinal = true;
                }
                if (currentFragmentState.encryptionAuxInfo && !trackData.samples[0].encryption) {
                  trackData.encryptionAuxInfo = currentFragmentState.encryptionAuxInfo;
                }
              }
              this.currentTrack.currentFragmentState = null;
              this.currentTrack = null;
            }
          }
          ;
          break;
        case "pssh":
          {
            if (this.input._formatOptions.isobmff?._suppressPsshParsing) {
              break;
            }
            const psshBox = parsePsshBoxContents(readBytes(slice, boxInfo.contentSize));
            if (this.currentFragment) {
              this.currentFragment.psshBoxes.push(psshBox);
            } else if (!this.currentTrack) {
              this.psshBoxes.push(psshBox);
            }
          }
          ;
          break;
        case "tfhd":
          {
            assert(this.currentFragment);
            slice.skip(1);
            const flags = readU24Be(slice);
            const baseDataOffsetPresent = Boolean(flags & 1);
            const sampleDescriptionIndexPresent = Boolean(flags & 2);
            const defaultSampleDurationPresent = Boolean(flags & 8);
            const defaultSampleSizePresent = Boolean(flags & 16);
            const defaultSampleFlagsPresent = Boolean(flags & 32);
            const durationIsEmpty = Boolean(flags & 65536);
            const defaultBaseIsMoof = Boolean(flags & 131072);
            const trackId = readU32Be(slice);
            const track = this.tracks.find((x2) => x2.id === trackId);
            if (!track) {
              break;
            }
            const defaults = this.fragmentTrackDefaults.find((x2) => x2.trackId === trackId);
            this.currentTrack = track;
            track.currentFragmentState = {
              baseDataOffset: this.currentFragment.implicitBaseDataOffset,
              sampleDescriptionIndex: defaults?.defaultSampleDescriptionIndex ?? null,
              defaultSampleDuration: defaults?.defaultSampleDuration ?? null,
              defaultSampleSize: defaults?.defaultSampleSize ?? null,
              defaultSampleFlags: defaults?.defaultSampleFlags ?? null,
              startTimestamp: null,
              encryptionAuxInfo: null
            };
            if (baseDataOffsetPresent) {
              track.currentFragmentState.baseDataOffset = readU64Be(slice);
            } else if (defaultBaseIsMoof) {
              track.currentFragmentState.baseDataOffset = this.currentFragment.moofOffset;
            }
            if (sampleDescriptionIndexPresent) {
              track.currentFragmentState.sampleDescriptionIndex = readU32Be(slice);
            }
            if (defaultSampleDurationPresent) {
              track.currentFragmentState.defaultSampleDuration = readU32Be(slice);
            }
            if (defaultSampleSizePresent) {
              track.currentFragmentState.defaultSampleSize = readU32Be(slice);
            }
            if (defaultSampleFlagsPresent) {
              track.currentFragmentState.defaultSampleFlags = readU32Be(slice);
            }
            if (durationIsEmpty) {
              track.currentFragmentState.defaultSampleDuration = 0;
            }
          }
          ;
          break;
        case "tfdt":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(track.currentFragmentState);
            const version = readU8(slice);
            slice.skip(3);
            const baseMediaDecodeTime = version === 0 ? readU32Be(slice) : readU64Be(slice);
            track.currentFragmentState.startTimestamp = baseMediaDecodeTime;
          }
          ;
          break;
        case "trun":
          {
            const track = this.currentTrack;
            if (!track) {
              break;
            }
            assert(this.currentFragment);
            assert(track.currentFragmentState);
            slice.skip(1);
            const flags = readU24Be(slice);
            const dataOffsetPresent = Boolean(flags & 1);
            const firstSampleFlagsPresent = Boolean(flags & 4);
            const sampleDurationPresent = Boolean(flags & 256);
            const sampleSizePresent = Boolean(flags & 512);
            const sampleFlagsPresent = Boolean(flags & 1024);
            const sampleCompositionTimeOffsetsPresent = Boolean(flags & 2048);
            const sampleCount = readU32Be(slice);
            let dataOffset = null;
            if (dataOffsetPresent) {
              dataOffset = readI32Be(slice);
            }
            let firstSampleFlags = null;
            if (firstSampleFlagsPresent) {
              firstSampleFlags = readU32Be(slice);
            }
            let trackData;
            if (this.currentFragment.trackData.has(track.id)) {
              trackData = this.currentFragment.trackData.get(track.id);
              if (dataOffset !== null) {
                trackData.currentOffset = track.currentFragmentState.baseDataOffset + dataOffset;
              } else {
              }
            } else {
              trackData = {
                track,
                currentTimestamp: 0,
                currentOffset: track.currentFragmentState.baseDataOffset + (dataOffset ?? 0),
                startTimestamp: 0,
                endTimestamp: 0,
                firstKeyFrameTimestamp: null,
                samples: [],
                presentationTimestamps: [],
                startTimestampIsFinal: false,
                encryptionAuxInfo: null
              };
              this.currentFragment.trackData.set(track.id, trackData);
            }
            for (let i3 = 0; i3 < sampleCount; i3++) {
              let sampleDuration;
              if (sampleDurationPresent) {
                sampleDuration = readU32Be(slice);
              } else {
                assert(track.currentFragmentState.defaultSampleDuration !== null);
                sampleDuration = track.currentFragmentState.defaultSampleDuration;
              }
              let sampleSize;
              if (sampleSizePresent) {
                sampleSize = readU32Be(slice);
              } else {
                assert(track.currentFragmentState.defaultSampleSize !== null);
                sampleSize = track.currentFragmentState.defaultSampleSize;
              }
              let sampleFlags;
              if (sampleFlagsPresent) {
                sampleFlags = readU32Be(slice);
              } else {
                assert(track.currentFragmentState.defaultSampleFlags !== null);
                sampleFlags = track.currentFragmentState.defaultSampleFlags;
              }
              if (i3 === 0 && firstSampleFlags !== null) {
                sampleFlags = firstSampleFlags;
              }
              let sampleCompositionTimeOffset = 0;
              if (sampleCompositionTimeOffsetsPresent) {
                sampleCompositionTimeOffset = readI32Be(slice);
              }
              const isKeyFrame = !(sampleFlags & 65536);
              trackData.samples.push({
                presentationTimestamp: trackData.currentTimestamp + sampleCompositionTimeOffset,
                duration: sampleDuration,
                byteOffset: trackData.currentOffset,
                byteSize: sampleSize,
                isKeyFrame,
                encryption: null
              });
              trackData.currentOffset += sampleSize;
              trackData.currentTimestamp += sampleDuration;
            }
            this.currentFragment.implicitBaseDataOffset = trackData.currentOffset;
          }
          ;
          break;
        case "saiz":
          {
            const track = this.currentTrack;
            if (!track || !track.encryptionInfo) {
              break;
            }
            slice.skip(1);
            const flags = readU24Be(slice);
            if (flags & 1) {
              const auxInfoType = readAscii(slice, 4);
              const auxInfoTypeParam = readU32Be(slice);
              if (auxInfoType !== track.encryptionInfo.scheme || auxInfoTypeParam !== 0) {
                break;
              }
            }
            const defaultSampleInfoSize = readU8(slice);
            const sampleCount = readU32Be(slice);
            let sampleSizes = null;
            if (defaultSampleInfoSize === 0 && sampleCount > 0) {
              sampleSizes = readBytes(slice, sampleCount);
            }
            const aux = getOrCreateEncryptionAuxInfo(track);
            aux.defaultSampleInfoSize = defaultSampleInfoSize;
            aux.sampleSizes = sampleSizes;
            aux.sampleCount = sampleCount;
          }
          ;
          break;
        case "saio":
          {
            const track = this.currentTrack;
            if (!track || !track.encryptionInfo) {
              break;
            }
            const version = readU8(slice);
            const flags = readU24Be(slice);
            if (flags & 1) {
              const auxInfoType = readAscii(slice, 4);
              const auxInfoTypeParam = readU32Be(slice);
              if (auxInfoType !== track.encryptionInfo.scheme || auxInfoTypeParam !== 0) {
                break;
              }
            }
            const entryCount = readU32Be(slice);
            if (entryCount === 0) {
              break;
            }
            if (entryCount > 1) {
              Logging._warn("Multiple saio entries are not supported; using the first offset only.");
            }
            let offset = version === 0 ? readU32Be(slice) : Number(readU64Be(slice));
            if (this.currentFragment) {
              offset += this.currentFragment.moofOffset;
            }
            const aux = getOrCreateEncryptionAuxInfo(track);
            aux.offset = offset;
          }
          ;
          break;
        case "senc":
          {
            const track = this.currentTrack;
            if (!track || !track.encryptionInfo) {
              break;
            }
            assert(this.currentFragment);
            const trackData = this.currentFragment.trackData.get(track.id);
            if (!trackData) {
              break;
            }
            slice.skip(1);
            const flags = readU24Be(slice);
            const useSubsamples = Boolean(flags & 2);
            const sampleCount = readU32Be(slice);
            const ivSize = track.encryptionInfo.defaultPerSampleIvSize;
            assert(ivSize !== null);
            for (let i3 = 0; i3 < Math.min(sampleCount, trackData.samples.length); i3++) {
              const iv = new Uint8Array(16);
              if (ivSize > 0) {
                iv.set(readBytes(slice, ivSize), 0);
              } else {
                iv.set(track.encryptionInfo.defaultConstantIv, 0);
              }
              let subsamples = null;
              if (useSubsamples) {
                const subsampleCount = readU16Be(slice);
                subsamples = [];
                for (let j3 = 0; j3 < subsampleCount; j3++) {
                  const clearLen = readU16Be(slice);
                  const protectedLen = readU32Be(slice);
                  subsamples.push({ clearLen, protectedLen });
                }
              }
              const sample = trackData.samples[i3];
              sample.encryption = { iv, subsamples };
            }
          }
          ;
          break;
        // Metadata section
        // https://exiftool.org/TagNames/QuickTime.html
        // https://mp4workshop.com/about
        case "udta":
          {
            const iterator = this.iterateContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
            for (const { boxInfo: boxInfo2, slice: slice2 } of iterator) {
              if (boxInfo2.name !== "meta" && !this.currentTrack) {
                const startPos2 = slice2.filePos;
                this.metadataTags.raw ??= {};
                if (boxInfo2.name[0] === "\xA9") {
                  this.metadataTags.raw[boxInfo2.name] ??= readMetadataStringShort(slice2);
                } else {
                  this.metadataTags.raw[boxInfo2.name] ??= readBytes(slice2, boxInfo2.contentSize);
                }
                slice2.filePos = startPos2;
              }
              switch (boxInfo2.name) {
                case "meta":
                  {
                    slice2.skip(-boxInfo2.headerSize);
                    this.traverseBox(slice2);
                  }
                  ;
                  break;
                case "\xA9nam":
                case "name":
                  {
                    if (this.currentTrack) {
                      this.currentTrack.name = textDecoder.decode(readBytes(slice2, boxInfo2.contentSize));
                    } else {
                      this.metadataTags.title ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
                case "\xA9des":
                  {
                    if (!this.currentTrack) {
                      this.metadataTags.description ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
                case "\xA9ART":
                  {
                    if (!this.currentTrack) {
                      this.metadataTags.artist ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
                case "\xA9alb":
                  {
                    if (!this.currentTrack) {
                      this.metadataTags.album ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
                case "albr":
                  {
                    if (!this.currentTrack) {
                      this.metadataTags.albumArtist ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
                case "\xA9gen":
                  {
                    if (!this.currentTrack) {
                      this.metadataTags.genre ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
                case "\xA9day":
                  {
                    if (!this.currentTrack) {
                      const date = new Date(readMetadataStringShort(slice2));
                      if (!Number.isNaN(date.getTime())) {
                        this.metadataTags.date ??= date;
                      }
                    }
                  }
                  ;
                  break;
                case "\xA9cmt":
                  {
                    if (!this.currentTrack) {
                      this.metadataTags.comment ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
                case "\xA9lyr":
                  {
                    if (!this.currentTrack) {
                      this.metadataTags.lyrics ??= readMetadataStringShort(slice2);
                    }
                  }
                  ;
                  break;
              }
            }
          }
          ;
          break;
        case "meta":
          {
            if (this.currentTrack) {
              break;
            }
            const word = readU32Be(slice);
            const isQuickTime = word !== 0;
            this.currentMetadataKeys = /* @__PURE__ */ new Map();
            if (isQuickTime) {
              this.readContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
            } else {
              this.readContiguousBoxes(slice.slice(contentStartPos + 4, boxInfo.contentSize - 4));
            }
            this.currentMetadataKeys = null;
          }
          ;
          break;
        case "keys":
          {
            if (!this.currentMetadataKeys) {
              break;
            }
            slice.skip(4);
            const entryCount = readU32Be(slice);
            for (let i3 = 0; i3 < entryCount; i3++) {
              const keySize = readU32Be(slice);
              slice.skip(4);
              const keyName = textDecoder.decode(readBytes(slice, keySize - 8));
              this.currentMetadataKeys.set(i3 + 1, keyName);
            }
          }
          ;
          break;
        case "ilst":
          {
            if (!this.currentMetadataKeys) {
              break;
            }
            const iterator = this.iterateContiguousBoxes(slice.slice(contentStartPos, boxInfo.contentSize));
            for (const { boxInfo: boxInfo2, slice: slice2 } of iterator) {
              let metadataKey = boxInfo2.name;
              const nameAsNumber = (metadataKey.charCodeAt(0) << 24) + (metadataKey.charCodeAt(1) << 16) + (metadataKey.charCodeAt(2) << 8) + metadataKey.charCodeAt(3);
              if (this.currentMetadataKeys.has(nameAsNumber)) {
                metadataKey = this.currentMetadataKeys.get(nameAsNumber);
              }
              const data = readDataBox(slice2);
              this.metadataTags.raw ??= {};
              this.metadataTags.raw[metadataKey] ??= data;
              switch (metadataKey) {
                case "\xA9nam":
                case "titl":
                case "com.apple.quicktime.title":
                case "title":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.title ??= data;
                    }
                  }
                  ;
                  break;
                case "\xA9des":
                case "desc":
                case "dscp":
                case "com.apple.quicktime.description":
                case "description":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.description ??= data;
                    }
                  }
                  ;
                  break;
                case "\xA9ART":
                case "com.apple.quicktime.artist":
                case "artist":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.artist ??= data;
                    }
                  }
                  ;
                  break;
                case "\xA9alb":
                case "albm":
                case "com.apple.quicktime.album":
                case "album":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.album ??= data;
                    }
                  }
                  ;
                  break;
                case "aART":
                case "album_artist":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.albumArtist ??= data;
                    }
                  }
                  ;
                  break;
                case "\xA9cmt":
                case "com.apple.quicktime.comment":
                case "comment":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.comment ??= data;
                    }
                  }
                  ;
                  break;
                case "\xA9gen":
                case "gnre":
                case "com.apple.quicktime.genre":
                case "genre":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.genre ??= data;
                    }
                  }
                  ;
                  break;
                case "\xA9lyr":
                case "lyrics":
                  {
                    if (typeof data === "string") {
                      this.metadataTags.lyrics ??= data;
                    }
                  }
                  ;
                  break;
                case "\xA9day":
                case "rldt":
                case "com.apple.quicktime.creationdate":
                case "date":
                  {
                    if (typeof data === "string") {
                      const date = new Date(data);
                      if (!Number.isNaN(date.getTime())) {
                        this.metadataTags.date ??= date;
                      }
                    }
                  }
                  ;
                  break;
                case "tmpo":
                  {
                    if (data instanceof Uint8Array && data.length >= 2) {
                      const bpm = toDataView(data).getInt16(0, false);
                      if (bpm > 0) {
                        this.metadataTags.beatsPerMinute ??= bpm;
                      }
                    }
                  }
                  ;
                  break;
                case "covr":
                case "com.apple.quicktime.artwork":
                  {
                    if (data instanceof RichImageData) {
                      this.metadataTags.images ??= [];
                      this.metadataTags.images.push({
                        data: data.data,
                        kind: "coverFront",
                        mimeType: data.mimeType
                      });
                    } else if (data instanceof Uint8Array) {
                      this.metadataTags.images ??= [];
                      this.metadataTags.images.push({
                        data,
                        kind: "coverFront",
                        mimeType: "image/*"
                      });
                    }
                  }
                  ;
                  break;
                case "track":
                  {
                    if (typeof data === "string") {
                      const parts = data.split("/");
                      const trackNum = Number.parseInt(parts[0], 10);
                      const tracksTotal = parts[1] && Number.parseInt(parts[1], 10);
                      if (Number.isInteger(trackNum) && trackNum > 0) {
                        this.metadataTags.trackNumber ??= trackNum;
                      }
                      if (tracksTotal && Number.isInteger(tracksTotal) && tracksTotal > 0) {
                        this.metadataTags.tracksTotal ??= tracksTotal;
                      }
                    }
                  }
                  ;
                  break;
                case "trkn":
                  {
                    if (data instanceof Uint8Array && data.length >= 6) {
                      const view = toDataView(data);
                      const trackNumber = view.getUint16(2, false);
                      const tracksTotal = view.getUint16(4, false);
                      if (trackNumber > 0) {
                        this.metadataTags.trackNumber ??= trackNumber;
                      }
                      if (tracksTotal > 0) {
                        this.metadataTags.tracksTotal ??= tracksTotal;
                      }
                    }
                  }
                  ;
                  break;
                case "disc":
                case "disk":
                  {
                    if (data instanceof Uint8Array && data.length >= 6) {
                      const view = toDataView(data);
                      const discNumber = view.getUint16(2, false);
                      const discNumberMax = view.getUint16(4, false);
                      if (discNumber > 0) {
                        this.metadataTags.discNumber ??= discNumber;
                      }
                      if (discNumberMax > 0) {
                        this.metadataTags.discsTotal ??= discNumberMax;
                      }
                    }
                  }
                  ;
                  break;
              }
            }
          }
          ;
          break;
      }
      slice.filePos = boxEndPos;
      return true;
    }
  };
  var IsobmffTrackBacking = class {
    constructor(internalTrack) {
      this.internalTrack = internalTrack;
      this.packetToSampleIndex = /* @__PURE__ */ new WeakMap();
      this.packetToFragmentLocation = /* @__PURE__ */ new WeakMap();
    }
    getId() {
      return this.internalTrack.id;
    }
    getNumber() {
      const demuxer = this.internalTrack.demuxer;
      const trackType = this.internalTrack.trackBacking.getType();
      let number = 0;
      for (const track of demuxer.tracks) {
        if (track.trackBacking.getType() === trackType) {
          number++;
        }
        if (track === this.internalTrack) {
          break;
        }
      }
      return number;
    }
    getCodec() {
      throw new Error("Not implemented on base class.");
    }
    getInternalCodecId() {
      return this.internalTrack.internalCodecId;
    }
    getName() {
      return this.internalTrack.name;
    }
    getLanguageCode() {
      return this.internalTrack.languageCode;
    }
    getTimeResolution() {
      return this.internalTrack.timescale;
    }
    isRelativeToUnixEpoch() {
      return false;
    }
    getUnixTimeForTimestamp() {
      return null;
    }
    getDisposition() {
      return this.internalTrack.disposition;
    }
    getPairingMask() {
      return 1n;
    }
    getBitrate() {
      return this.internalTrack.maxBitrate;
    }
    getAverageBitrate() {
      return this.internalTrack.avgBitrate;
    }
    async getDurationFromMetadata() {
      const track = this.internalTrack;
      if (track.durationInMediaTimescale <= 0) {
        return null;
      }
      assert(track.trackBacking);
      const firstPacket = await track.trackBacking.getFirstPacket({ metadataOnly: true });
      return (firstPacket?.timestamp ?? 0) + track.durationInMediaTimescale / track.timescale;
    }
    async getLiveRefreshInterval() {
      return null;
    }
    async getFirstPacket(options) {
      const regularPacket = await this.fetchPacketForSampleIndex(0, options);
      if (regularPacket || !this.internalTrack.demuxer.isFragmented) {
        return regularPacket;
      }
      return this.performFragmentedLookup(
        null,
        (fragment) => {
          const trackData = fragment.trackData.get(this.internalTrack.id);
          if (trackData) {
            return {
              sampleIndex: 0,
              correctSampleFound: true
            };
          }
          return {
            sampleIndex: -1,
            correctSampleFound: false
          };
        },
        -Infinity,
        // Use -Infinity as a search timestamp to avoid using the lookup entries
        Infinity,
        options
      );
    }
    mapTimestampIntoTimescale(timestamp) {
      return roundIfAlmostInteger(timestamp * this.internalTrack.timescale) + this.internalTrack.editListOffset;
    }
    async getPacket(timestamp, options) {
      const timestampInTimescale = this.mapTimestampIntoTimescale(timestamp);
      const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
      const sampleIndex = getSampleIndexForTimestamp(sampleTable, timestampInTimescale);
      const regularPacket = await this.fetchPacketForSampleIndex(sampleIndex, options);
      if (!sampleTableIsEmpty(sampleTable) || !this.internalTrack.demuxer.isFragmented) {
        return regularPacket;
      }
      return this.performFragmentedLookup(null, (fragment) => {
        const trackData = fragment.trackData.get(this.internalTrack.id);
        if (!trackData) {
          return { sampleIndex: -1, correctSampleFound: false };
        }
        const index = binarySearchLessOrEqual(trackData.presentationTimestamps, timestampInTimescale, (x2) => x2.presentationTimestamp);
        const sampleIndex2 = index !== -1 ? trackData.presentationTimestamps[index].sampleIndex : -1;
        const correctSampleFound = index !== -1 && timestampInTimescale < trackData.endTimestamp;
        return { sampleIndex: sampleIndex2, correctSampleFound };
      }, timestampInTimescale, timestampInTimescale, options);
    }
    async getNextPacket(packet, options) {
      const regularSampleIndex = this.packetToSampleIndex.get(packet);
      if (regularSampleIndex !== void 0) {
        return this.fetchPacketForSampleIndex(regularSampleIndex + 1, options);
      }
      const locationInFragment = this.packetToFragmentLocation.get(packet);
      if (locationInFragment === void 0) {
        throw new Error("Packet was not created from this track.");
      }
      return this.performFragmentedLookup(
        locationInFragment.fragment,
        (fragment) => {
          if (fragment === locationInFragment.fragment) {
            const trackData = fragment.trackData.get(this.internalTrack.id);
            if (locationInFragment.sampleIndex + 1 < trackData.samples.length) {
              return {
                sampleIndex: locationInFragment.sampleIndex + 1,
                correctSampleFound: true
              };
            }
          } else {
            const trackData = fragment.trackData.get(this.internalTrack.id);
            if (trackData) {
              return {
                sampleIndex: 0,
                correctSampleFound: true
              };
            }
          }
          return {
            sampleIndex: -1,
            correctSampleFound: false
          };
        },
        -Infinity,
        // Use -Infinity as a search timestamp to avoid using the lookup entries
        Infinity,
        options
      );
    }
    async getKeyPacket(timestamp, options) {
      const timestampInTimescale = this.mapTimestampIntoTimescale(timestamp);
      const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
      const sampleIndex = getKeyframeSampleIndexForTimestamp(sampleTable, timestampInTimescale);
      const regularPacket = await this.fetchPacketForSampleIndex(sampleIndex, options);
      if (!sampleTableIsEmpty(sampleTable) || !this.internalTrack.demuxer.isFragmented) {
        return regularPacket;
      }
      return this.performFragmentedLookup(null, (fragment) => {
        const trackData = fragment.trackData.get(this.internalTrack.id);
        if (!trackData) {
          return { sampleIndex: -1, correctSampleFound: false };
        }
        const index = findLastIndex(trackData.presentationTimestamps, (x2) => {
          const sample = trackData.samples[x2.sampleIndex];
          return sample.isKeyFrame && x2.presentationTimestamp <= timestampInTimescale;
        });
        const sampleIndex2 = index !== -1 ? trackData.presentationTimestamps[index].sampleIndex : -1;
        const correctSampleFound = index !== -1 && timestampInTimescale < trackData.endTimestamp;
        return { sampleIndex: sampleIndex2, correctSampleFound };
      }, timestampInTimescale, timestampInTimescale, options);
    }
    async getNextKeyPacket(packet, options) {
      const regularSampleIndex = this.packetToSampleIndex.get(packet);
      if (regularSampleIndex !== void 0) {
        const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
        const nextKeyFrameSampleIndex = getNextKeyframeIndexForSample(sampleTable, regularSampleIndex);
        return this.fetchPacketForSampleIndex(nextKeyFrameSampleIndex, options);
      }
      const locationInFragment = this.packetToFragmentLocation.get(packet);
      if (locationInFragment === void 0) {
        throw new Error("Packet was not created from this track.");
      }
      return this.performFragmentedLookup(
        locationInFragment.fragment,
        (fragment) => {
          if (fragment === locationInFragment.fragment) {
            const trackData = fragment.trackData.get(this.internalTrack.id);
            const nextKeyFrameIndex = trackData.samples.findIndex((x2, i3) => x2.isKeyFrame && i3 > locationInFragment.sampleIndex);
            if (nextKeyFrameIndex !== -1) {
              return {
                sampleIndex: nextKeyFrameIndex,
                correctSampleFound: true
              };
            }
          } else {
            const trackData = fragment.trackData.get(this.internalTrack.id);
            if (trackData && trackData.firstKeyFrameTimestamp !== null) {
              const keyFrameIndex = trackData.samples.findIndex((x2) => x2.isKeyFrame);
              assert(keyFrameIndex !== -1);
              return {
                sampleIndex: keyFrameIndex,
                correctSampleFound: true
              };
            }
          }
          return {
            sampleIndex: -1,
            correctSampleFound: false
          };
        },
        -Infinity,
        // Use -Infinity as a search timestamp to avoid using the lookup entries
        Infinity,
        options
      );
    }
    async fetchPacketForSampleIndex(sampleIndex, options) {
      if (sampleIndex === -1) {
        return null;
      }
      const sampleTable = this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack);
      const sampleInfo = getSampleInfo(sampleTable, sampleIndex);
      if (!sampleInfo) {
        return null;
      }
      let data;
      if (options.metadataOnly) {
        data = PLACEHOLDER_DATA;
      } else {
        let slice = this.internalTrack.demuxer.reader.requestSlice(sampleInfo.sampleOffset, sampleInfo.sampleSize);
        if (isThenable(slice))
          slice = await slice;
        if (!slice) {
          return null;
        }
        data = readBytes(slice, sampleInfo.sampleSize);
        if (this.internalTrack.encryptionInfo) {
          let sampleEncryption = null;
          if (this.internalTrack.encryptionAuxInfo) {
            const entries = await resolveEncryptionAuxInfo(this.internalTrack.demuxer.reader, this.internalTrack.encryptionInfo, this.internalTrack.encryptionAuxInfo);
            if (sampleIndex < entries.length) {
              sampleEncryption = entries[sampleIndex];
            }
          }
          sampleEncryption ??= getDefaultSampleEncryption(this.internalTrack.encryptionInfo);
          if (sampleEncryption) {
            data = await decryptSample(this.internalTrack, sampleEncryption, data, null);
          }
        }
      }
      const timestamp = (sampleInfo.presentationTimestamp - this.internalTrack.editListOffset) / this.internalTrack.timescale;
      const duration = sampleInfo.duration / this.internalTrack.timescale;
      const packet = new EncodedPacket(data, sampleInfo.isKeyFrame ? "key" : "delta", timestamp, duration, sampleIndex, sampleInfo.sampleSize);
      this.packetToSampleIndex.set(packet, sampleIndex);
      return packet;
    }
    async fetchPacketInFragment(fragment, sampleIndex, options) {
      if (sampleIndex === -1) {
        return null;
      }
      const trackData = fragment.trackData.get(this.internalTrack.id);
      const fragmentSample = trackData.samples[sampleIndex];
      assert(fragmentSample);
      let data;
      if (options.metadataOnly) {
        data = PLACEHOLDER_DATA;
      } else {
        let slice = this.internalTrack.demuxer.reader.requestSlice(fragmentSample.byteOffset, fragmentSample.byteSize);
        if (isThenable(slice))
          slice = await slice;
        if (!slice) {
          return null;
        }
        data = readBytes(slice, fragmentSample.byteSize);
        if (this.internalTrack.encryptionInfo) {
          const sampleEncryption = fragmentSample.encryption ?? getDefaultSampleEncryption(this.internalTrack.encryptionInfo);
          if (sampleEncryption) {
            data = await decryptSample(this.internalTrack, sampleEncryption, data, fragment);
          }
        }
      }
      const timestamp = (fragmentSample.presentationTimestamp - this.internalTrack.editListOffset) / this.internalTrack.timescale;
      const duration = fragmentSample.duration / this.internalTrack.timescale;
      const packet = new EncodedPacket(data, fragmentSample.isKeyFrame ? "key" : "delta", timestamp, duration, fragment.moofOffset + sampleIndex, fragmentSample.byteSize);
      this.packetToFragmentLocation.set(packet, { fragment, sampleIndex });
      return packet;
    }
    /** Looks for a packet in the fragments while trying to load as few fragments as possible to retrieve it. */
    async performFragmentedLookup(startFragment, getMatchInFragment, searchTimestamp, latestTimestamp, options) {
      const demuxer = this.internalTrack.demuxer;
      let currentFragment = null;
      let bestFragment = null;
      let bestSampleIndex = -1;
      if (startFragment) {
        const { sampleIndex, correctSampleFound } = getMatchInFragment(startFragment);
        if (correctSampleFound) {
          return this.fetchPacketInFragment(startFragment, sampleIndex, options);
        }
        if (sampleIndex !== -1) {
          bestFragment = startFragment;
          bestSampleIndex = sampleIndex;
        }
      }
      const lookupEntryIndex = binarySearchLessOrEqual(this.internalTrack.fragmentLookupTable, searchTimestamp, (x2) => x2.timestamp);
      const lookupEntry = lookupEntryIndex !== -1 ? this.internalTrack.fragmentLookupTable[lookupEntryIndex] : null;
      const positionCacheIndex = binarySearchLessOrEqual(this.internalTrack.fragmentPositionCache, searchTimestamp, (x2) => x2.startTimestamp);
      const positionCacheEntry = positionCacheIndex !== -1 ? this.internalTrack.fragmentPositionCache[positionCacheIndex] : null;
      const lookupEntryPosition = Math.max(lookupEntry?.moofOffset ?? 0, positionCacheEntry?.moofOffset ?? 0) || null;
      let currentPos;
      if (!startFragment) {
        currentPos = lookupEntryPosition ?? 0;
      } else {
        if (lookupEntryPosition === null || startFragment.moofOffset >= lookupEntryPosition) {
          currentPos = startFragment.moofOffset + startFragment.moofSize;
          currentFragment = startFragment;
        } else {
          currentPos = lookupEntryPosition;
        }
      }
      while (true) {
        if (currentFragment) {
          const trackData = currentFragment.trackData.get(this.internalTrack.id);
          if (trackData && trackData.startTimestamp > latestTimestamp) {
            break;
          }
        }
        let slice = demuxer.reader.requestSliceRange(currentPos, MIN_BOX_HEADER_SIZE, MAX_BOX_HEADER_SIZE);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          break;
        const boxStartPos = currentPos;
        const boxInfo = readBoxHeader(slice);
        if (!boxInfo) {
          break;
        }
        if (boxInfo.name === "moof") {
          currentFragment = await demuxer.readFragment(boxStartPos);
          const { sampleIndex, correctSampleFound } = getMatchInFragment(currentFragment);
          if (correctSampleFound) {
            return this.fetchPacketInFragment(currentFragment, sampleIndex, options);
          }
          if (sampleIndex !== -1) {
            bestFragment = currentFragment;
            bestSampleIndex = sampleIndex;
          }
        }
        currentPos = boxStartPos + boxInfo.totalSize;
      }
      if (lookupEntry && (!bestFragment || bestFragment.moofOffset < lookupEntry.moofOffset)) {
        const previousLookupEntry = this.internalTrack.fragmentLookupTable[lookupEntryIndex - 1];
        assert(!previousLookupEntry || previousLookupEntry.timestamp < lookupEntry.timestamp);
        const newSearchTimestamp = previousLookupEntry?.timestamp ?? -Infinity;
        return this.performFragmentedLookup(null, getMatchInFragment, newSearchTimestamp, latestTimestamp, options);
      }
      if (bestFragment) {
        return this.fetchPacketInFragment(bestFragment, bestSampleIndex, options);
      }
      return null;
    }
  };
  var IsobmffVideoTrackBacking = class extends IsobmffTrackBacking {
    constructor(internalTrack) {
      super(internalTrack);
      this.decoderConfigPromise = null;
    }
    getType() {
      return "video";
    }
    getCodec() {
      return this.internalTrack.info.codec;
    }
    getCodedWidth() {
      return this.internalTrack.info.width;
    }
    getCodedHeight() {
      return this.internalTrack.info.height;
    }
    getSquarePixelWidth() {
      return this.internalTrack.info.squarePixelWidth;
    }
    getSquarePixelHeight() {
      return this.internalTrack.info.squarePixelHeight;
    }
    getTransformationMatrix() {
      return [...this.internalTrack.matrix];
    }
    async getColorSpace() {
      const decoderConfig = await this.getDecoderConfig();
      if (!decoderConfig) {
        return this.internalTrack.info.colorSpace;
      }
      return {
        primaries: decoderConfig.colorSpace?.primaries,
        transfer: decoderConfig.colorSpace?.transfer,
        matrix: decoderConfig.colorSpace?.matrix,
        fullRange: decoderConfig.colorSpace?.fullRange
      };
    }
    async canBeTransparent() {
      return this.internalTrack.info.codec === "prores" && (this.internalTrack.info.proresFormat === "ap4h" || this.internalTrack.info.proresFormat === "ap4x");
    }
    async getDecoderConfig() {
      if (!this.internalTrack.info.codec) {
        return null;
      }
      return this.decoderConfigPromise ??= (async () => {
        if (this.internalTrack.info.codec === "avc" && !this.internalTrack.info.codecDescription) {
          const firstPacket = await this.getFirstPacket({});
          this.internalTrack.info.avcCodecInfo = firstPacket && extractAvcDecoderConfigurationRecord(firstPacket.data);
        } else if (this.internalTrack.info.codec === "hevc" && !this.internalTrack.info.codecDescription) {
          const firstPacket = await this.getFirstPacket({});
          this.internalTrack.info.hevcCodecInfo = firstPacket && extractHevcDecoderConfigurationRecord(firstPacket.data);
        } else if (this.internalTrack.info.codec === "vp9" && (!this.internalTrack.info.vp9CodecInfo || !vp9CodecInfoHasColorInfo(this.internalTrack.info.vp9CodecInfo))) {
          const firstPacket = await this.getFirstPacket({});
          const packetInfo = firstPacket && extractVp9CodecInfoFromPacket(firstPacket.data);
          if (packetInfo) {
            this.internalTrack.info.vp9CodecInfo = {
              ...this.internalTrack.info.vp9CodecInfo ?? packetInfo,
              videoFullRangeFlag: packetInfo.videoFullRangeFlag,
              colourPrimaries: packetInfo.colourPrimaries,
              transferCharacteristics: packetInfo.transferCharacteristics,
              matrixCoefficients: packetInfo.matrixCoefficients
            };
          }
        } else if (this.internalTrack.info.codec === "av1" && (!this.internalTrack.info.av1CodecInfo || !av1CodecInfoHasColorInfo(this.internalTrack.info.av1CodecInfo))) {
          const firstPacket = await this.getFirstPacket({});
          const packetInfo = firstPacket && extractAv1CodecInfoFromPacket(firstPacket.data);
          if (packetInfo) {
            this.internalTrack.info.av1CodecInfo = packetInfo;
          }
        } else if (this.internalTrack.info.codec === "prores" && !this.internalTrack.info.proresCodecInfo) {
          const firstPacket = await this.getFirstPacket({});
          this.internalTrack.info.proresCodecInfo = firstPacket && extractProresCodecInfoFromPacket(firstPacket.data);
        }
        if (!colorSpaceIsComplete(this.internalTrack.info.colorSpace)) {
          const colorSpace = extractColorSpace(this.internalTrack.info);
          this.internalTrack.info.colorSpace.primaries ??= colorSpace.primaries;
          this.internalTrack.info.colorSpace.transfer ??= colorSpace.transfer;
          this.internalTrack.info.colorSpace.matrix ??= colorSpace.matrix;
          this.internalTrack.info.colorSpace.fullRange ??= colorSpace.fullRange;
        }
        const config = {
          codec: extractVideoCodecString(this.internalTrack.info),
          codedWidth: this.internalTrack.info.width,
          codedHeight: this.internalTrack.info.height,
          description: this.internalTrack.info.codecDescription ?? void 0,
          colorSpace: this.internalTrack.info.colorSpace
        };
        if (this.internalTrack.info.width !== this.internalTrack.info.squarePixelWidth || this.internalTrack.info.height !== this.internalTrack.info.squarePixelHeight) {
          config.displayAspectWidth = this.internalTrack.info.squarePixelWidth;
          config.displayAspectHeight = this.internalTrack.info.squarePixelHeight;
        }
        return config;
      })();
    }
  };
  var IsobmffAudioTrackBacking = class extends IsobmffTrackBacking {
    constructor(internalTrack) {
      super(internalTrack);
      this.decoderConfigPromise = null;
    }
    getType() {
      return "audio";
    }
    getCodec() {
      return this.internalTrack.info.codec;
    }
    getNumberOfChannels() {
      return this.internalTrack.info.numberOfChannels;
    }
    getSampleRate() {
      return this.internalTrack.info.sampleRate;
    }
    async getDecoderConfig() {
      if (!this.internalTrack.info.codec) {
        return null;
      }
      return this.decoderConfigPromise ??= (async () => {
        if (this.internalTrack.info.codec === "dts" && !this.internalTrack.info.dtsFormat) {
          const firstPacket = await this.getFirstPacket({});
          this.internalTrack.info.dtsFormat = firstPacket && extractDtsFourCcFromPacket(firstPacket.data);
        }
        return {
          codec: extractAudioCodecString(this.internalTrack.info),
          numberOfChannels: this.internalTrack.info.numberOfChannels,
          sampleRate: this.internalTrack.info.sampleRate,
          description: this.internalTrack.info.codecDescription ?? void 0
        };
      })();
    }
  };
  var getSampleIndexForTimestamp = (sampleTable, timescaleUnits) => {
    if (sampleTable.presentationTimestamps) {
      const index = binarySearchLessOrEqual(sampleTable.presentationTimestamps, timescaleUnits, (x2) => x2.presentationTimestamp);
      if (index === -1) {
        return -1;
      }
      return sampleTable.presentationTimestamps[index].sampleIndex;
    } else {
      const index = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, timescaleUnits, (x2) => x2.startDecodeTimestamp);
      if (index === -1) {
        return -1;
      }
      const entry = sampleTable.sampleTimingEntries[index];
      return entry.startIndex + Math.min(Math.floor((timescaleUnits - entry.startDecodeTimestamp) / entry.delta), entry.count - 1);
    }
  };
  var getKeyframeSampleIndexForTimestamp = (sampleTable, timescaleUnits) => {
    if (!sampleTable.keySampleIndices) {
      return getSampleIndexForTimestamp(sampleTable, timescaleUnits);
    }
    if (sampleTable.presentationTimestamps) {
      const index = binarySearchLessOrEqual(sampleTable.presentationTimestamps, timescaleUnits, (x2) => x2.presentationTimestamp);
      if (index === -1) {
        return -1;
      }
      for (let i3 = index; i3 >= 0; i3--) {
        const sampleIndex = sampleTable.presentationTimestamps[i3].sampleIndex;
        const isKeyFrame = binarySearchExact(sampleTable.keySampleIndices, sampleIndex, (x2) => x2) !== -1;
        if (isKeyFrame) {
          return sampleIndex;
        }
      }
      return -1;
    } else {
      const sampleIndex = getSampleIndexForTimestamp(sampleTable, timescaleUnits);
      const index = binarySearchLessOrEqual(sampleTable.keySampleIndices, sampleIndex, (x2) => x2);
      return sampleTable.keySampleIndices[index] ?? -1;
    }
  };
  var getSampleInfo = (sampleTable, sampleIndex) => {
    const timingEntryIndex = binarySearchLessOrEqual(sampleTable.sampleTimingEntries, sampleIndex, (x2) => x2.startIndex);
    const timingEntry = sampleTable.sampleTimingEntries[timingEntryIndex];
    if (!timingEntry || timingEntry.startIndex + timingEntry.count <= sampleIndex) {
      return null;
    }
    const decodeTimestamp = timingEntry.startDecodeTimestamp + (sampleIndex - timingEntry.startIndex) * timingEntry.delta;
    let presentationTimestamp = decodeTimestamp;
    const offsetEntryIndex = binarySearchLessOrEqual(sampleTable.sampleCompositionTimeOffsets, sampleIndex, (x2) => x2.startIndex);
    const offsetEntry = sampleTable.sampleCompositionTimeOffsets[offsetEntryIndex];
    if (offsetEntry && sampleIndex - offsetEntry.startIndex < offsetEntry.count) {
      presentationTimestamp += offsetEntry.offset;
    }
    const sampleSize = sampleTable.sampleSizes[Math.min(sampleIndex, sampleTable.sampleSizes.length - 1)];
    const chunkEntryIndex = binarySearchLessOrEqual(sampleTable.sampleToChunk, sampleIndex, (x2) => x2.startSampleIndex);
    const chunkEntry = sampleTable.sampleToChunk[chunkEntryIndex];
    assert(chunkEntry);
    const chunkIndex = chunkEntry.startChunkIndex + Math.floor((sampleIndex - chunkEntry.startSampleIndex) / chunkEntry.samplesPerChunk);
    const chunkOffset = sampleTable.chunkOffsets[chunkIndex];
    const startSampleIndexOfChunk = chunkEntry.startSampleIndex + (chunkIndex - chunkEntry.startChunkIndex) * chunkEntry.samplesPerChunk;
    let chunkSize = 0;
    let sampleOffset = chunkOffset;
    if (sampleTable.sampleSizes.length === 1) {
      sampleOffset += sampleSize * (sampleIndex - startSampleIndexOfChunk);
      chunkSize += sampleSize * chunkEntry.samplesPerChunk;
    } else {
      for (let i3 = startSampleIndexOfChunk; i3 < startSampleIndexOfChunk + chunkEntry.samplesPerChunk; i3++) {
        const sampleSize2 = sampleTable.sampleSizes[i3];
        if (i3 < sampleIndex) {
          sampleOffset += sampleSize2;
        }
        chunkSize += sampleSize2;
      }
    }
    let duration = timingEntry.delta;
    if (sampleTable.presentationTimestamps) {
      const presentationIndex = sampleTable.presentationTimestampIndexMap[sampleIndex];
      assert(presentationIndex !== void 0);
      if (presentationIndex < sampleTable.presentationTimestamps.length - 1) {
        const nextEntry = sampleTable.presentationTimestamps[presentationIndex + 1];
        const nextPresentationTimestamp = nextEntry.presentationTimestamp;
        duration = nextPresentationTimestamp - presentationTimestamp;
      }
    }
    return {
      presentationTimestamp,
      duration,
      sampleOffset,
      sampleSize,
      chunkOffset,
      chunkSize,
      isKeyFrame: sampleTable.keySampleIndices ? binarySearchExact(sampleTable.keySampleIndices, sampleIndex, (x2) => x2) !== -1 : true
    };
  };
  var getNextKeyframeIndexForSample = (sampleTable, sampleIndex) => {
    if (!sampleTable.keySampleIndices) {
      return sampleIndex + 1;
    }
    const index = binarySearchLessOrEqual(sampleTable.keySampleIndices, sampleIndex, (x2) => x2);
    return sampleTable.keySampleIndices[index + 1] ?? -1;
  };
  var offsetFragmentTrackDataByTimestamp = (trackData, timestamp) => {
    trackData.startTimestamp += timestamp;
    trackData.endTimestamp += timestamp;
    for (const sample of trackData.samples) {
      sample.presentationTimestamp += timestamp;
    }
    for (const entry of trackData.presentationTimestamps) {
      entry.presentationTimestamp += timestamp;
    }
  };
  var readMatrix = (slice) => {
    return [
      readFixed_16_16(slice),
      readFixed_16_16(slice),
      readFixed_2_30(slice),
      readFixed_16_16(slice),
      readFixed_16_16(slice),
      readFixed_2_30(slice),
      readFixed_16_16(slice),
      readFixed_16_16(slice),
      readFixed_2_30(slice)
    ];
  };
  var applySpsPixelAspectRatio = (track, pixelAspectRatio) => {
    const info = track.info;
    if (info.type !== "video") {
      return;
    }
    const { num, den } = pixelAspectRatio;
    if (!(num > 0 && den > 0) || num === den) {
      return;
    }
    if (num > den) {
      info.squarePixelWidth = Math.round(info.width * num / den);
      info.squarePixelHeight = info.height;
    } else {
      info.squarePixelWidth = info.width;
      info.squarePixelHeight = Math.round(info.height * den / num);
    }
  };
  var sampleTableIsEmpty = (sampleTable) => {
    return sampleTable.sampleSizes.length === 0;
  };
  var getOrCreateEncryptionAuxInfo = (track) => {
    if (track.currentFragmentState) {
      return track.currentFragmentState.encryptionAuxInfo ??= {
        defaultSampleInfoSize: 0,
        sampleSizes: null,
        sampleCount: 0,
        offset: null,
        resolved: null
      };
    } else {
      return track.encryptionAuxInfo ??= {
        defaultSampleInfoSize: 0,
        sampleSizes: null,
        sampleCount: 0,
        offset: null,
        resolved: null
      };
    }
  };
  var resolveEncryptionAuxInfo = async (reader, encryptionInfo, aux) => {
    if (aux.resolved) {
      return aux.resolved;
    }
    if (aux.offset === null || aux.sampleCount === 0) {
      throw new Error("Incomplete saiz/saio info; cannot resolve encryption data.");
    }
    let totalSize = 0;
    if (aux.defaultSampleInfoSize > 0) {
      totalSize = aux.defaultSampleInfoSize * aux.sampleCount;
    } else {
      assert(aux.sampleSizes);
      for (let i3 = 0; i3 < aux.sampleCount; i3++) {
        totalSize += aux.sampleSizes[i3];
      }
    }
    let slice = reader.requestSlice(aux.offset, totalSize);
    if (isThenable(slice))
      slice = await slice;
    if (!slice) {
      throw new Error("Failed to read auxiliary encryption info.");
    }
    const ivSize = encryptionInfo.defaultPerSampleIvSize;
    assert(ivSize !== null);
    const entries = [];
    for (let i3 = 0; i3 < aux.sampleCount; i3++) {
      const entrySize = aux.defaultSampleInfoSize > 0 ? aux.defaultSampleInfoSize : aux.sampleSizes[i3];
      const iv = new Uint8Array(16);
      if (ivSize > 0) {
        iv.set(readBytes(slice, ivSize), 0);
      } else {
        iv.set(encryptionInfo.defaultConstantIv, 0);
      }
      let subsamples = null;
      if (entrySize > ivSize) {
        const subsampleCount = readU16Be(slice);
        subsamples = [];
        for (let j3 = 0; j3 < subsampleCount; j3++) {
          const clearLen = readU16Be(slice);
          const protectedLen = readU32Be(slice);
          subsamples.push({ clearLen, protectedLen });
        }
      }
      entries.push({ iv, subsamples });
    }
    aux.resolved = entries;
    return entries;
  };
  var getDefaultSampleEncryption = (encryptionInfo) => {
    if (!encryptionInfo.defaultConstantIv) {
      return null;
    }
    return {
      iv: encryptionInfo.defaultConstantIv,
      subsamples: null
    };
  };
  var decryptSample = async (track, sampleEncryption, data, fragment) => {
    assert(track.encryptionInfo);
    const encryptionInfo = track.encryptionInfo;
    assert(encryptionInfo.defaultKid !== null);
    const keyId = encryptionInfo.defaultKid;
    let keyBytes;
    const cacheEntry = track.demuxer.decryptionKeyCache.get(keyId);
    if (cacheEntry) {
      keyBytes = await cacheEntry;
    } else {
      if (!track.demuxer.input._formatOptions.isobmff?.resolveKeyId) {
        throw new Error("Encrypted media samples encountered. To decrypt them, please provide a callback for InputOptions.formatOptions.isobmff.resolveKeyId.");
      }
      const promise = (async () => {
        let psshBoxes = track.demuxer.psshBoxes;
        if (fragment) {
          psshBoxes = [
            ...psshBoxes,
            ...fragment.psshBoxes
          ].filter((x2) => x2.keyIds === null || x2.keyIds.includes(keyId));
          for (let i3 = 0; i3 < psshBoxes.length - 1; i3++) {
            for (let j3 = i3 + 1; j3 < psshBoxes.length; j3++) {
              if (psshBoxesAreEqual(psshBoxes[i3], psshBoxes[j3])) {
                psshBoxes.splice(j3, 1);
                j3--;
              }
            }
          }
        }
        const keyResult = await track.demuxer.input._formatOptions.isobmff.resolveKeyId({ keyId, psshBoxes });
        if (!(typeof keyResult === "string" && keyResult.length === 32 && HEX_STRING_REGEX.test(keyResult) || keyResult instanceof Uint8Array && keyResult.byteLength === 16)) {
          throw new TypeError("resolveKeyId must return a 32-character hex string or a 16-byte Uint8Array containing the decryption key.");
        }
        return keyResult instanceof Uint8Array ? keyResult : hexStringToBytes(keyResult);
      })();
      track.demuxer.decryptionKeyCache.set(keyId, promise);
      keyBytes = await promise;
    }
    if (encryptionInfo.scheme === "cenc" || encryptionInfo.scheme === "cens") {
      return decryptCtr(keyBytes, encryptionInfo, sampleEncryption, data);
    } else {
      return decryptCbcs(keyBytes, encryptionInfo, sampleEncryption, data);
    }
  };
  var decryptCtr = async (key, encryptionInfo, sampleEncryption, data) => {
    const counter = new Uint8Array(16);
    counter.set(sampleEncryption.iv, 0);
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CTR" }, false, ["decrypt"]);
    const cryptApply = async (input) => {
      const plaintext = await crypto.subtle.decrypt({ name: "AES-CTR", counter, length: 64 }, cryptoKey, input);
      return new Uint8Array(plaintext);
    };
    if (!sampleEncryption.subsamples) {
      return cryptApply(data);
    }
    assert(encryptionInfo.defaultCryptByteBlock !== null && encryptionInfo.defaultSkipByteBlock !== null);
    const cryptRanges = collectCryptRanges(sampleEncryption.subsamples, encryptionInfo.defaultCryptByteBlock, encryptionInfo.defaultSkipByteBlock);
    let totalCryptLen = 0;
    for (const range2 of cryptRanges) {
      for (const seg of range2.perSubsample) {
        totalCryptLen += seg.length;
      }
    }
    const cryptBuffer = new Uint8Array(totalCryptLen);
    let writePos = 0;
    for (const range2 of cryptRanges) {
      for (const seg of range2.perSubsample) {
        cryptBuffer.set(data.subarray(seg.offset, seg.offset + seg.length), writePos);
        writePos += seg.length;
      }
    }
    const plain = await cryptApply(cryptBuffer);
    const output = new Uint8Array(data);
    let readPos = 0;
    for (const range2 of cryptRanges) {
      for (const seg of range2.perSubsample) {
        output.set(plain.subarray(readPos, readPos + seg.length), seg.offset);
        readPos += seg.length;
      }
    }
    return output;
  };
  var decryptCbcs = (key, encryptionInfo, sampleEncryption, data) => {
    const ctx = new Aes128CbcContext();
    ctx.init({ key, iv: sampleEncryption.iv });
    const cryptByteBlock = encryptionInfo.defaultCryptByteBlock;
    const skipByteBlock = encryptionInfo.defaultSkipByteBlock;
    assert(cryptByteBlock !== null && skipByteBlock !== null);
    if (!sampleEncryption.subsamples) {
      const output2 = new Uint8Array(data);
      const numBlocks = Math.floor(data.length / 16);
      for (let b2 = 0; b2 < numBlocks; b2++) {
        const off = b2 * 16;
        ctx.in.set(data.subarray(off, off + 16));
        ctx.decrypt();
        output2.set(ctx.out, off);
      }
      return output2;
    }
    if (cryptByteBlock === 0 && skipByteBlock === 0) {
      throw new Error("cbcs with subsamples requires pattern encryption.");
    }
    const output = new Uint8Array(data);
    const cryptRanges = collectCryptRanges(sampleEncryption.subsamples, cryptByteBlock, skipByteBlock);
    const ivView = new DataView(sampleEncryption.iv.buffer, sampleEncryption.iv.byteOffset, 16);
    for (const range2 of cryptRanges) {
      ctx.iv[0] = ivView.getUint32(0, false);
      ctx.iv[1] = ivView.getUint32(4, false);
      ctx.iv[2] = ivView.getUint32(8, false);
      ctx.iv[3] = ivView.getUint32(12, false);
      for (const seg of range2.perSubsample) {
        const numBlocks = seg.length / 16;
        for (let b2 = 0; b2 < numBlocks; b2++) {
          const offset = seg.offset + b2 * 16;
          ctx.in.set(data.subarray(offset, offset + 16));
          ctx.decrypt();
          output.set(ctx.out, offset);
        }
      }
    }
    return output;
  };
  var collectCryptRanges = (subsamples, cryptByteBlock, skipByteBlock) => {
    const ranges = [];
    const hasPattern = cryptByteBlock !== 0 || skipByteBlock !== 0;
    let cursor = 0;
    for (const subsample of subsamples) {
      cursor += subsample.clearLen;
      const perSubsample = [];
      if (!hasPattern) {
        if (subsample.protectedLen > 0) {
          perSubsample.push({ offset: cursor, length: subsample.protectedLen });
        }
        cursor += subsample.protectedLen;
      } else {
        let remaining = subsample.protectedLen;
        let pos = cursor;
        while (remaining > 0) {
          if (remaining < 16 * cryptByteBlock) {
            break;
          }
          const cryptBytes = 16 * cryptByteBlock;
          perSubsample.push({ offset: pos, length: cryptBytes });
          pos += cryptBytes;
          remaining -= cryptBytes;
          const skipBytes = Math.min(16 * skipByteBlock, remaining);
          pos += skipBytes;
          remaining -= skipBytes;
        }
        cursor += subsample.protectedLen;
      }
      ranges.push({ perSubsample });
    }
    return ranges;
  };

  // node_modules/mediabunny/dist/modules/src/source.js
  polyfillSymbolDispose();
  var DEFAULT_MIN_READ_POSITION = 0;
  var DEFAULT_MAX_READ_POSITION = Infinity;
  var sourceFinalizationRegistry = null;
  if (typeof FinalizationRegistry !== "undefined") {
    sourceFinalizationRegistry = new FinalizationRegistry((cleanup) => {
      cleanup();
    });
  }
  var Source = class extends EventEmitter {
    constructor() {
      super();
      this._disposed = false;
      this._refCount = 0;
      this._usedForHls = false;
      this._refFinalizationRegistry = null;
      this._sizePromise = null;
      this.onread = null;
      if (typeof FinalizationRegistry !== "undefined") {
        this._refFinalizationRegistry = new FinalizationRegistry((source) => {
          source._decrementRefCount();
        });
      }
    }
    /**
     * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
     * will retrieve the size.
     *
     * Returns null if the source is unsized.
     */
    async getSizeOrNull() {
      if (this._disposed) {
        throw new InputDisposedError();
      }
      return this._sizePromise ??= (async () => {
        let size = this._getFileSize();
        if (size !== void 0) {
          return size;
        }
        await this._read(0, 1, DEFAULT_MIN_READ_POSITION, DEFAULT_MAX_READ_POSITION);
        size = this._getFileSize();
        assert(size !== void 0);
        return size;
      })();
    }
    /**
     * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
     * will retrieve the size.
     *
     * Throws an error if the source is unsized.
     */
    async getSize() {
      if (this._disposed) {
        throw new InputDisposedError();
      }
      const result = await this.getSizeOrNull();
      if (result === null) {
        throw new Error("Cannot determine the size of an unsized source.");
      }
      return result;
    }
    /**
     * Returns a new {@link RangedSource} that maps data onto this source using the given offset and length. If a length
     * is not provided, the ranged source spans until the end of this source's data.
     *
     * Useful for reading files that are embedded within larger files.
     */
    slice(offset, length) {
      if (!Number.isInteger(offset) || offset < 0) {
        throw new TypeError("offset must be a non-negative integer.");
      }
      if (length !== void 0 && (!Number.isInteger(length) || length < 0)) {
        throw new TypeError("length, when provided, must be a non-negative integer.");
      }
      return new RangedSource(this, offset, length);
    }
    /** @internal */
    _dispatchRead(start, end) {
      this.onread?.(start, end);
      this._emit("read", { start, end });
    }
    /**
     * Creates a new `SourceRef` pointing to this source. You are expected to call `.free()` on said `SourceRef` when
     * you're done with it.
     */
    ref() {
      return new SourceRef(this);
    }
    /** @internal */
    _incrementRefCount() {
      this._refCount++;
    }
    /** @internal */
    _decrementRefCount() {
      this._refCount--;
      if (this._refCount === 0) {
        this._dispose();
        this._disposed = true;
      }
    }
  };
  var SourceRef = class {
    /** @internal */
    constructor(source) {
      this._freed = false;
      if (source._disposed) {
        throw new Error("Cannot ref a disposed source.");
      }
      source._incrementRefCount();
      source._refFinalizationRegistry?.register(this, source, this);
      this._source = source;
    }
    /** The {@link Source} this ref references. Accessing this field throws an error after having freed the ref. */
    get source() {
      if (!this._source) {
        throw new Error("Can't get source; ref has already been freed.");
      }
      return this._source;
    }
    /** Whether or not this reference has been freed via {@link SourceRef.free}. */
    get freed() {
      return this._freed;
    }
    /**
     * Frees the ref, decrementing the source's internal reference count. If the source's internal reference count
     * reaches zero, it gets disposed. To catch bugs, this method throws if the ref is already freed.
     */
    free() {
      if (this._freed) {
        throw new Error("Illegal operation: double free on SourceRef.");
      }
      const source = this.source;
      assert(source._refCount > 0);
      source._decrementRefCount();
      source._refFinalizationRegistry?.unregister(this);
      this._freed = true;
      this._source = null;
    }
    /**
     * Calls {@link SourceRef.free}.
     */
    [Symbol.dispose]() {
      if (!this.freed) {
        this.free();
      }
    }
  };
  var PathedSource = class extends Source {
    constructor(rootPath, requestHandler) {
      if (typeof rootPath !== "string") {
        throw new TypeError("rootPath must be a string.");
      }
      if (typeof requestHandler !== "function") {
        throw new TypeError("requestHandler must be a function.");
      }
      super();
      this.rootPath = rootPath;
      this.requestHandler = requestHandler;
    }
    /** @internal */
    _resolveRequest(request2) {
      const result = this.requestHandler(request2);
      const handle = (result2) => {
        if (!(result2 instanceof Source || result2 instanceof SourceRef)) {
          throw new TypeError("requestHandler must return or resolve to a Source or SourceRef.");
        }
        const ref = result2 instanceof Source ? result2.ref() : result2;
        ref.source._usedForHls ||= this._usedForHls;
        return ref;
      };
      if (isThenable(result)) {
        return result.then(handle);
      } else {
        return handle(result);
      }
    }
  };
  var sourceRequestsAreEqual = (a3, b2) => {
    return a3.path === b2.path;
  };
  var blobReaderRegistry = typeof FinalizationRegistry !== "undefined" ? new FinalizationRegistry((reader) => {
    void reader.cancel().catch(() => {
    });
  }) : null;
  var URL_SOURCE_MIN_LOAD_AMOUNT = 0.5 * 2 ** 20;
  var DEFAULT_RETRY_DELAY = ((previousAttempts, error, src) => {
    const couldBeCorsError = error instanceof Error && (error.message.includes("Failed to fetch") || error.message.includes("Load failed") || error.message.includes("NetworkError when attempting to fetch resource")) && typeof window !== "undefined";
    if (couldBeCorsError) {
      let originOfSrc = null;
      try {
        if (typeof window !== "undefined" && typeof window.location !== "undefined") {
          originOfSrc = new URL(src instanceof Request ? src.url : src, window.location.href).origin;
        }
      } catch {
      }
      const isOnline = typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" ? navigator.onLine : true;
      if (isOnline && originOfSrc !== null && originOfSrc !== window.location.origin) {
        Logging._warn(`Request will not be retried because a CORS error was suspected due to different origins. You can modify this behavior by providing your own function for the 'getRetryDelay' option.`);
        return null;
      }
    }
    return Math.min(2 ** (previousAttempts - 2), 16);
  });
  var warnedOrigins = /* @__PURE__ */ new Set();
  var UrlSource = class _UrlSource extends PathedSource {
    /**
     * Creates a new {@link UrlSource} backed by the resource at the specified URL.
     *
     * When passing a `Request` instance, note that its `signal` will be overridden by Mediabunny; if you want to cancel
     * ongoing requests, use {@link Input.dispose}.
     */
    constructor(url, options = {}) {
      if (typeof url !== "string" && !(url instanceof URL) && !(typeof Request !== "undefined" && url instanceof Request)) {
        throw new TypeError("url must be a string, URL or Request.");
      }
      if (!options || typeof options !== "object") {
        throw new TypeError("options must be an object.");
      }
      if (options.requestInit !== void 0 && (!options.requestInit || typeof options.requestInit !== "object")) {
        throw new TypeError("options.requestInit, when provided, must be an object.");
      }
      if (options.getRetryDelay !== void 0 && typeof options.getRetryDelay !== "function") {
        throw new TypeError("options.getRetryDelay, when provided, must be a function.");
      }
      if (options.maxCacheSize !== void 0 && (!isNumber(options.maxCacheSize) || options.maxCacheSize < 0)) {
        throw new TypeError("options.maxCacheSize, when provided, must be a non-negative number.");
      }
      if (options.parallelism !== void 0 && (!Number.isInteger(options.parallelism) || options.parallelism < 1)) {
        throw new TypeError("options.parallelism, when provided, must be a positive number.");
      }
      if (options.fetchFn !== void 0 && typeof options.fetchFn !== "function") {
        throw new TypeError("options.fetchFn, when provided, must be a function.");
      }
      if (options.handleUnhandledError !== void 0 && typeof options.handleUnhandledError !== "function") {
        throw new TypeError("options.handleUnhandledError, when provided, must be a function.");
      }
      const urlString = url instanceof Request ? url.url : url instanceof URL ? url.href : url;
      super(urlString, (request2) => new _UrlSource(request2.path, this._options));
      this._offset = 0;
      this._length = null;
      this._fileSizeDetermined = false;
      this._sequentialBacking = null;
      this._abortControllers = /* @__PURE__ */ new Map();
      this._sequentialAbortController = null;
      this._url = url;
      this._options = options;
      this._getRetryDelay = options.getRetryDelay ?? DEFAULT_RETRY_DELAY;
      this._requestInit = { ...options.requestInit };
      let rangeHeaderValue = null;
      if (options.requestInit?.headers) {
        const headers = { ...normalizeHeaders(options.requestInit.headers) };
        const rangeKey = Object.keys(headers).find((key) => key.toLowerCase() === "range");
        if (rangeKey !== void 0) {
          rangeHeaderValue = headers[rangeKey];
          delete headers[rangeKey];
          this._requestInit.headers = headers;
        }
      }
      if (url instanceof Request) {
        const requestRange = url.headers.get("Range");
        if (requestRange !== null) {
          rangeHeaderValue ??= requestRange;
          const strippedRequest = new Request(url);
          strippedRequest.headers.delete("Range");
          this._url = strippedRequest;
        }
      }
      if (rangeHeaderValue !== null) {
        const parsed = parseByteRangeHeader(rangeHeaderValue);
        if (parsed) {
          this._offset = parsed.offset;
          this._length = parsed.length;
        }
      }
      const DEFAULT_PARALLELISM = 2;
      this._orchestrator = new ReadOrchestrator({
        maxCacheSize: options.maxCacheSize ?? 64 * 2 ** 20,
        maxWorkerCount: options.parallelism ?? DEFAULT_PARALLELISM,
        runWorker: this._runWorker.bind(this),
        onIdleWorkerRemoved: (worker) => this._abortControllers.delete(worker),
        prefetchProfile: PREFETCH_PROFILES.network,
        handleUnhandledError: options.handleUnhandledError
      });
    }
    /** @internal */
    _getFileSize() {
      if (!this._fileSizeDetermined) {
        return this._length !== null ? this._length : void 0;
      }
      const baseSize = this._sequentialBacking ? this._sequentialBacking._endIndex : this._orchestrator.fileSize;
      if (baseSize === null) {
        return this._length !== null ? this._length : null;
      }
      return clamp5(baseSize - this._offset, 0, this._length ?? Infinity);
    }
    /** @internal */
    _read(start, end, minReadPosition, maxReadPosition) {
      if (this._length !== null && end > this._length) {
        return null;
      }
      const offset = this._offset;
      const result = this._sequentialBacking ? this._sequentialBacking._read(offset + start, offset + end) : this._orchestrator.read(offset + start, offset + end, Math.max(offset + minReadPosition, offset), offset + Math.min(maxReadPosition, this._length ?? Infinity));
      const processResult = (result2) => {
        if (!result2) {
          return null;
        }
        result2.offset -= this._offset;
        return result2;
      };
      if (isThenable(result)) {
        return result.then(processResult);
      } else {
        return processResult(result);
      }
    }
    /** @internal */
    async _runWorker(worker) {
      while (true) {
        if (worker.aborted) {
          this._orchestrator.signalWorkerStoppedRunning(worker);
          return;
        }
        const abortController = new AbortController();
        this._abortControllers.set(worker, abortController);
        const response = await retriedFetch(this._options.fetchFn ?? fetch, this._url, mergeRequestInit(this._requestInit, {
          headers: {
            // Always sending a range request is a good way to probe if the server supports them
            Range: `bytes=${worker.currentPos}-`
          },
          signal: abortController.signal
        }), this._getRetryDelay, () => abortController.signal.aborted);
        if (!response.ok) {
          throw new Error(`Error fetching ${String(this._url)}: ${response.status} ${response.statusText}`);
        }
        if (response.redirected) {
          this.rootPath = response.url;
        }
        outer: if (this._orchestrator.fileSize === null && !response.headers.has("Content-Encoding") && (response.status === 206 || response.type === "basic")) {
          const contentRange = response.headers.get("Content-Range");
          if (contentRange) {
            const match = /\/(\d+)/.exec(contentRange);
            if (match) {
              this._orchestrator.supplyFileSize(Number(match[1]));
              break outer;
            }
          }
          const contentLength = response.headers.get("Content-Length");
          if (contentLength) {
            const basePos = response.status === 206 ? worker.currentPos : 0;
            this._orchestrator.supplyFileSize(basePos + Number(contentLength));
          }
        }
        this._fileSizeDetermined = true;
        if (!response.body) {
          throw new Error("Missing HTTP response body stream. The used fetch function must provide the response body as a ReadableStream.");
        }
        if (response.status !== 206) {
          if (this._sequentialBacking) {
            void response.body.cancel().catch(() => {
            });
            return;
          }
          if (!this._usedForHls) {
            const url = new URL(this._url instanceof Request ? this._url.url : this._url, typeof window !== "undefined" ? window.location.href : void 0);
            if (url.origin !== "null" && !(url.pathname.endsWith(".m3u8") || url.pathname.endsWith(".m3u"))) {
              if (!warnedOrigins.has(url.origin)) {
                Logging._warn(`HTTP server (origin ${url.origin}) did not respond to a range request with 206 Partial Content, meaning the resource will now be streamed sequentially, with old data being evicted from the cache. Reads into evicted regions will throw. To enable efficient media file streaming across a network, please make sure your server supports range requests. Alternatively, set maxCacheSize to Infinity in the UrlSource options to keep the entire resource in memory.`);
                warnedOrigins.add(url.origin);
              }
            }
          }
          this._abortControllers.delete(worker);
          this._transitionToSequentialMode(response.body, abortController);
          return;
        }
        const reader = response.body.getReader();
        while (true) {
          if (worker.currentPos >= worker.targetPos || worker.aborted) {
            abortController.abort();
            this._orchestrator.signalWorkerStoppedRunning(worker);
            return;
          }
          let readResult;
          try {
            readResult = await reader.read();
          } catch (error) {
            if (abortController.signal.aborted) {
              throw error;
            }
            const retryDelayInSeconds = this._getRetryDelay(1, error, this._url);
            if (retryDelayInSeconds !== null) {
              Logging._error("Error while reading response stream. Attempting to resume.", error);
              await wait(1e3 * retryDelayInSeconds);
              break;
            } else {
              throw error;
            }
          }
          if (worker.aborted) {
            continue;
          }
          const { done, value } = readResult;
          if (done) {
            if (worker.currentPos >= worker.targetPos) {
              this._orchestrator.onWorkerFinished(worker);
              return;
            }
            if (worker.strictTarget) {
              break;
            } else {
              this._orchestrator.onWorkerFinished(worker);
              return;
            }
          }
          this._dispatchRead(worker.currentPos, worker.currentPos + value.length);
          this._orchestrator.supplyWorkerData(worker, value);
        }
      }
    }
    /** @internal */
    _transitionToSequentialMode(body, abortController) {
      this._sequentialAbortController = abortController;
      let currentReader = body.getReader();
      let streamPosition = 0;
      let skipRemaining = 0;
      const wrappedStream = new ReadableStream({
        pull: async (controller) => {
          while (true) {
            let readResult;
            try {
              readResult = await currentReader.read();
            } catch (error) {
              if (this._disposed) {
                throw error;
              }
              const retryDelayInSeconds = this._getRetryDelay(1, error, this._url);
              if (retryDelayInSeconds === null) {
                throw error;
              }
              Logging._error("Error while reading response stream. Attempting to resume.", error);
              await wait(1e3 * retryDelayInSeconds);
              this._sequentialAbortController = new AbortController();
              if (this._disposed) {
                this._sequentialAbortController.abort();
              }
              const newResponse = await retriedFetch(this._options.fetchFn ?? fetch, this._url, mergeRequestInit(this._requestInit, {
                headers: {
                  // Who knows, maybe the server honors range requests this time
                  Range: `bytes=${streamPosition}-`
                },
                signal: this._sequentialAbortController.signal
              }), this._getRetryDelay, () => this._disposed);
              if (!newResponse.ok) {
                throw new Error(
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  `Error fetching ${String(this._url)}: ${newResponse.status} ${newResponse.statusText}`
                );
              }
              if (!newResponse.body) {
                throw new Error("Missing HTTP response body stream. The used fetch function must provide the response body as a ReadableStream.");
              }
              currentReader = newResponse.body.getReader();
              skipRemaining = newResponse.status === 206 ? 0 : streamPosition;
              continue;
            }
            if (readResult.done) {
              controller.close();
              return;
            }
            let chunk = readResult.value;
            if (skipRemaining > 0) {
              const skippedAmount = Math.min(skipRemaining, chunk.length);
              skipRemaining -= skippedAmount;
              chunk = chunk.subarray(skippedAmount);
            }
            if (chunk.length === 0) {
              continue;
            }
            streamPosition += chunk.length;
            controller.enqueue(chunk);
            return;
          }
        },
        cancel: () => currentReader.cancel().catch(() => {
        })
      });
      const backing = new ReadableStreamSource(wrappedStream, {
        maxCacheSize: this._orchestrator.options.maxCacheSize,
        handleUnhandledError: this._options.handleUnhandledError
      });
      backing._endIndex = this._orchestrator.fileSize;
      backing._cacheMissErrorMessage = "Attempted to read data from an already-evicted part of the cache. Because the HTTP server did not honor the range request, data can only be read sequentially, with old data being evicted from the cache. To fix this issue, either ensure your server responds to range requests with 206 Partial Content, or set maxCacheSize to Infinity in the UrlSource options. Note that the latter will store the entire file in the cache if needed, no matter how large.";
      backing.on("read", ({ start, end }) => this._dispatchRead(start, end));
      this._sequentialBacking = backing;
      const uniqueSlices = /* @__PURE__ */ new Set();
      for (const otherWorker of this._orchestrator.workers) {
        for (const slice of otherWorker.pendingSlices) {
          uniqueSlices.add(slice);
        }
        otherWorker.aborted = true;
        otherWorker.pendingSlices.length = 0;
      }
      for (const queuedRead of this._orchestrator.queuedReads) {
        for (const slice of queuedRead.pendingSlices) {
          uniqueSlices.add(slice);
        }
      }
      this._orchestrator.workers.length = 0;
      this._orchestrator.queuedReads.length = 0;
      for (const [, otherAbortController] of this._abortControllers) {
        otherAbortController.abort();
      }
      this._abortControllers.clear();
      for (const slice of uniqueSlices) {
        const result = backing._read(slice.start, slice.start + slice.bytes.length);
        if (isThenable(result)) {
          result.then((readResult) => {
            if (readResult) {
              assert(readResult.offset === slice.start);
              slice.resolve(readResult.bytes);
            } else {
              slice.resolve(null);
            }
          }, (error) => slice.reject(error));
        } else {
          assert(result === null);
          slice.resolve(null);
        }
      }
    }
    /** @internal */
    _dispose() {
      this._orchestrator.dispose();
      for (const [, abortController] of this._abortControllers) {
        abortController.abort();
      }
      this._abortControllers.clear();
      this._sequentialAbortController?.abort();
      if (this._sequentialBacking) {
        this._sequentialBacking._disposed = true;
        this._sequentialBacking._dispose();
      }
    }
  };
  var BYTE_RANGE_REGEX = /^bytes=(\d+)-(\d*)$/;
  var parseByteRangeHeader = (value) => {
    const match = BYTE_RANGE_REGEX.exec(value.trim());
    if (!match) {
      return null;
    }
    const offset = Number(match[1]);
    const end = match[2] === "" ? null : Number(match[2]);
    if (end !== null && end < offset) {
      return null;
    }
    return {
      offset,
      length: end !== null ? end - offset + 1 : null
    };
  };
  var ReadableStreamSource = class extends Source {
    /** Creates a new {@link ReadableStreamSource} backed by the specified `ReadableStream<Uint8Array>`. */
    constructor(stream, options = {}) {
      if (!(stream instanceof ReadableStream)) {
        throw new TypeError("stream must be a ReadableStream.");
      }
      if (!options || typeof options !== "object") {
        throw new TypeError("options must be an object.");
      }
      if (options.handleUnhandledError !== void 0 && typeof options.handleUnhandledError !== "function") {
        throw new TypeError("options.handleUnhandledError, when provided, must be a function.");
      }
      if (options.maxCacheSize !== void 0 && (!isNumber(options.maxCacheSize) || options.maxCacheSize < 0)) {
        throw new TypeError("options.maxCacheSize, when provided, must be a non-negative number.");
      }
      super();
      this._reader = null;
      this._cache = [];
      this._pendingSlices = [];
      this._currentIndex = 0;
      this._targetIndex = 0;
      this._maxRequestedIndex = 0;
      this._endIndex = null;
      this._pulling = false;
      this._cacheMissErrorMessage = "Attempted to read data from an already-evicted part of the cache. With ReadableStreamSource, you must access the data more sequentially or increase the size of its cache.";
      this._stream = stream;
      this._maxCacheSize = options.maxCacheSize ?? 32 * 2 ** 20;
      this._handleUnhandledError = options.handleUnhandledError;
    }
    /** @internal */
    _getFileSize() {
      return this._endIndex;
    }
    /** @internal */
    _read(start, end) {
      if (this._endIndex !== null && end > this._endIndex) {
        return null;
      }
      this._maxRequestedIndex = Math.max(this._maxRequestedIndex, end);
      const cacheStartIndex = binarySearchLessOrEqual(this._cache, start, (x2) => x2.start);
      const cacheStartEntry = cacheStartIndex !== -1 ? this._cache[cacheStartIndex] : null;
      if (cacheStartEntry && cacheStartEntry.start <= start && end <= cacheStartEntry.end) {
        return {
          bytes: cacheStartEntry.bytes,
          view: cacheStartEntry.view,
          offset: cacheStartEntry.start
        };
      }
      let lastEnd = start;
      const bytes = new Uint8Array(end - start);
      if (cacheStartIndex !== -1) {
        for (let i3 = cacheStartIndex; i3 < this._cache.length; i3++) {
          const cacheEntry = this._cache[i3];
          if (cacheEntry.start >= end) {
            break;
          }
          const cappedStart = Math.max(start, cacheEntry.start);
          if (cappedStart > lastEnd) {
            this._throwDueToCacheMiss();
          }
          const cappedEnd = Math.min(end, cacheEntry.end);
          if (cappedStart < cappedEnd) {
            bytes.set(cacheEntry.bytes.subarray(cappedStart - cacheEntry.start, cappedEnd - cacheEntry.start), cappedStart - start);
            lastEnd = cappedEnd;
          }
        }
      }
      if (lastEnd === end) {
        return {
          bytes,
          view: toDataView(bytes),
          offset: start
        };
      }
      if (this._currentIndex > lastEnd) {
        this._throwDueToCacheMiss();
      }
      const { promise, resolve, reject } = promiseWithResolvers();
      this._pendingSlices.push({
        start,
        end,
        bytes,
        resolve,
        reject
      });
      this._targetIndex = Math.max(this._targetIndex, end);
      if (!this._pulling) {
        this._pulling = true;
        void this._pull().catch((error) => {
          this._pulling = false;
          if (this._pendingSlices.length > 0) {
            this._pendingSlices.forEach((x2) => x2.reject(error));
            this._pendingSlices.length = 0;
          } else if (this._handleUnhandledError) {
            this._handleUnhandledError(error);
          } else {
            throw error;
          }
        });
      }
      return promise;
    }
    /** @internal */
    _throwDueToCacheMiss() {
      throw new Error(this._cacheMissErrorMessage);
    }
    /** @internal */
    async _pull() {
      this._reader ??= this._stream.getReader();
      while (this._currentIndex < this._targetIndex && !this._disposed) {
        const { done, value } = await this._reader.read();
        if (done) {
          for (const pendingSlice of this._pendingSlices) {
            pendingSlice.resolve(null);
          }
          this._pendingSlices.length = 0;
          this._endIndex = this._currentIndex;
          break;
        }
        const startIndex = this._currentIndex;
        const endIndex = this._currentIndex + value.byteLength;
        this._dispatchRead(startIndex, endIndex);
        for (let i3 = 0; i3 < this._pendingSlices.length; i3++) {
          const pendingSlice = this._pendingSlices[i3];
          const cappedStart = Math.max(startIndex, pendingSlice.start);
          const cappedEnd = Math.min(endIndex, pendingSlice.end);
          if (cappedStart < cappedEnd) {
            pendingSlice.bytes.set(value.subarray(cappedStart - startIndex, cappedEnd - startIndex), cappedStart - pendingSlice.start);
            if (cappedEnd === pendingSlice.end) {
              pendingSlice.resolve({
                bytes: pendingSlice.bytes,
                view: toDataView(pendingSlice.bytes),
                offset: pendingSlice.start
              });
              this._pendingSlices.splice(i3, 1);
              i3--;
            }
          }
        }
        this._cache.push({
          start: startIndex,
          end: endIndex,
          bytes: value,
          view: toDataView(value),
          age: 0
          // Unused
        });
        while (this._cache.length > 0) {
          const firstEntry = this._cache[0];
          const distance2 = this._maxRequestedIndex - firstEntry.end;
          if (distance2 <= this._maxCacheSize) {
            break;
          }
          this._cache.shift();
        }
        this._currentIndex += value.byteLength;
      }
      this._pulling = false;
    }
    /** @internal */
    _dispose() {
      for (const pendingSlice of this._pendingSlices) {
        pendingSlice.reject(new InputDisposedError());
      }
      this._pendingSlices.length = 0;
      this._cache.length = 0;
      void this._reader?.cancel().catch(() => {
      });
    }
  };
  var PREFETCH_PROFILES = {
    none: (start, end) => ({ start, end }),
    fileSystem: (start, end) => {
      const padding = 2 ** 16;
      start = Math.floor((start - padding) / padding) * padding;
      end = Math.ceil((end + padding) / padding) * padding;
      return { start, end };
    },
    network: (start, end, workers) => {
      const paddingStart = 2 ** 16;
      start = Math.max(0, Math.floor((start - paddingStart) / paddingStart) * paddingStart);
      for (const worker of workers) {
        const maxExtensionAmount = 8 * 2 ** 20;
        const thresholdPoint = Math.max((worker.startPos + worker.targetPos) / 2, worker.targetPos - maxExtensionAmount);
        if (closedIntervalsOverlap(start, end, thresholdPoint, worker.targetPos)) {
          const size = worker.targetPos - worker.startPos;
          const a3 = Math.ceil((size + 1) / maxExtensionAmount) * maxExtensionAmount;
          const b2 = 2 ** Math.ceil(Math.log2(size + 1));
          const extent = Math.min(b2, a3);
          end = Math.max(end, worker.startPos + extent);
        }
      }
      end = Math.max(end, start + URL_SOURCE_MIN_LOAD_AMOUNT);
      return {
        start,
        end
      };
    }
  };
  var ReadOrchestrator = class {
    constructor(options) {
      this.options = options;
      this.fileSize = null;
      this.nextAge = 0;
      this.workers = [];
      this.cache = [];
      this.currentCacheSize = 0;
      this.disposed = false;
      this.queuedReads = [];
    }
    read(innerStart, innerEnd, minReadPosition, maxReadPosition) {
      assert(!this.disposed);
      const prefetchRange = this.options.prefetchProfile(innerStart, innerEnd, this.workers);
      const outerStart = Math.max(prefetchRange.start, minReadPosition);
      const outerEnd = Math.min(prefetchRange.end, this.fileSize ?? Infinity, maxReadPosition);
      assert(outerStart <= innerStart && innerEnd <= outerEnd);
      let result = null;
      const innerCacheStartIndex = binarySearchLessOrEqual(this.cache, innerStart, (x2) => x2.start);
      const innerStartEntry = innerCacheStartIndex !== -1 ? this.cache[innerCacheStartIndex] : null;
      if (innerStartEntry && innerStartEntry.start <= innerStart && innerEnd <= innerStartEntry.end) {
        innerStartEntry.age = this.nextAge++;
        result = {
          bytes: innerStartEntry.bytes,
          view: innerStartEntry.view,
          offset: innerStartEntry.start
        };
      }
      const outerCacheStartIndex = binarySearchLessOrEqual(this.cache, outerStart, (x2) => x2.start);
      const bytes = result ? null : new Uint8Array(innerEnd - innerStart);
      let contiguousBytesWriteEnd = 0;
      let lastEnd = outerStart;
      const outerHoles = [];
      if (outerCacheStartIndex !== -1) {
        for (let i3 = outerCacheStartIndex; i3 < this.cache.length; i3++) {
          const entry = this.cache[i3];
          if (entry.start >= outerEnd) {
            break;
          }
          if (entry.end <= outerStart) {
            continue;
          }
          const cappedOuterStart = Math.max(outerStart, entry.start);
          const cappedOuterEnd = Math.min(outerEnd, entry.end);
          assert(cappedOuterStart <= cappedOuterEnd);
          if (lastEnd < cappedOuterStart) {
            outerHoles.push({ start: lastEnd, end: cappedOuterStart });
          }
          lastEnd = cappedOuterEnd;
          if (bytes) {
            const cappedInnerStart = Math.max(innerStart, entry.start);
            const cappedInnerEnd = Math.min(innerEnd, entry.end);
            if (cappedInnerStart < cappedInnerEnd) {
              const relativeOffset = cappedInnerStart - innerStart;
              bytes.set(entry.bytes.subarray(cappedInnerStart - entry.start, cappedInnerEnd - entry.start), relativeOffset);
              if (relativeOffset === contiguousBytesWriteEnd) {
                contiguousBytesWriteEnd = cappedInnerEnd - innerStart;
              }
            }
          }
          entry.age = this.nextAge++;
        }
        if (lastEnd < outerEnd) {
          outerHoles.push({ start: lastEnd, end: outerEnd });
        }
      } else {
        outerHoles.push({ start: outerStart, end: outerEnd });
      }
      if (bytes && contiguousBytesWriteEnd >= bytes.length) {
        result = {
          bytes,
          view: toDataView(bytes),
          offset: innerStart
        };
      }
      if (outerHoles.length === 0) {
        assert(result);
        return result;
      }
      const { promise, resolve, reject } = promiseWithResolvers();
      const innerHoles = [];
      for (const outerHole of outerHoles) {
        const cappedStart = Math.max(innerStart, outerHole.start);
        const cappedEnd = Math.min(innerEnd, outerHole.end);
        if (cappedStart === outerHole.start && cappedEnd === outerHole.end) {
          innerHoles.push(outerHole);
        } else if (cappedStart < cappedEnd) {
          innerHoles.push({ start: cappedStart, end: cappedEnd });
        }
      }
      const pendingSlice = bytes && {
        start: innerStart,
        bytes,
        holes: innerHoles,
        resolve,
        reject
      };
      outer: for (const outerHole of outerHoles) {
        for (const worker of this.workers) {
          const addedToWorker = this.checkHoleAgainstWorker(worker, outerHole, pendingSlice ? [pendingSlice] : []);
          if (addedToWorker) {
            this.checkQueuedReadsAgainstWorker(worker);
            continue outer;
          }
        }
        const strictTarget = outerHole.end < outerEnd || this.fileSize !== null;
        const newWorker = this.createWorker(outerHole.start, outerHole.end, strictTarget);
        if (newWorker) {
          if (pendingSlice) {
            newWorker.pendingSlices = [pendingSlice];
          }
          this.runWorker(newWorker);
        } else {
          let index = binarySearchLessOrEqual(this.queuedReads, outerHole.start, (x2) => x2.hole.start);
          let entry = index !== -1 ? this.queuedReads[index] : null;
          if (entry && outerHole.start <= entry.hole.end) {
            entry.hole.end = Math.max(entry.hole.end, outerHole.end);
            entry.strictTarget &&= strictTarget;
            if (pendingSlice) {
              entry.pendingSlices.push(pendingSlice);
            }
          } else {
            index++;
            entry = {
              hole: {
                // Clone the hole because it might be mutated later
                start: outerHole.start,
                end: outerHole.end
              },
              strictTarget,
              pendingSlices: pendingSlice ? [pendingSlice] : [],
              age: this.nextAge++
            };
            this.queuedReads.splice(index, 0, entry);
          }
          while (index + 1 < this.queuedReads.length) {
            const nextEntry = this.queuedReads[index + 1];
            if (nextEntry.hole.start > entry.hole.end) {
              break;
            }
            entry.hole.end = Math.max(entry.hole.end, nextEntry.hole.end);
            entry.pendingSlices.push(...nextEntry.pendingSlices);
            entry.strictTarget &&= nextEntry.strictTarget;
            entry.age = Math.min(entry.age, nextEntry.age);
            this.queuedReads.splice(index + 1, 1);
          }
        }
      }
      if (!result) {
        assert(bytes);
        result = promise.then((bytes2) => bytes2 && {
          bytes: bytes2,
          view: toDataView(bytes2),
          offset: innerStart
        });
      } else {
        promise.catch((error) => {
          if (this.disposed) {
            return;
          }
          if (this.options.handleUnhandledError) {
            this.options.handleUnhandledError(error);
          } else {
            throw error;
          }
        });
      }
      return result;
    }
    checkHoleAgainstWorker(worker, hole, pendingSlices) {
      const gapTolerance = 2 ** 17;
      if (closedIntervalsOverlap(hole.start - gapTolerance, hole.start, worker.currentPos, worker.targetPos)) {
        worker.targetPos = Math.max(worker.targetPos, hole.end);
        for (let i3 = 0; i3 < pendingSlices.length; i3++) {
          const pendingSlice = pendingSlices[i3];
          if (!worker.pendingSlices.includes(pendingSlice)) {
            worker.pendingSlices.push(pendingSlice);
          }
        }
        if (!worker.running) {
          this.runWorker(worker);
        }
        return true;
      }
      return false;
    }
    checkQueuedReadsAgainstWorker(worker) {
      let wasTrueOnce = false;
      for (let i3 = 0; i3 < this.queuedReads.length; i3++) {
        const queuedRead = this.queuedReads[i3];
        const result = this.checkHoleAgainstWorker(worker, queuedRead.hole, queuedRead.pendingSlices);
        if (result) {
          this.queuedReads.splice(i3, 1);
          i3--;
          wasTrueOnce = true;
        } else if (wasTrueOnce) {
          break;
        }
      }
    }
    createWorker(startPos, targetPos, strictTarget) {
      if (this.workers.length >= this.options.maxWorkerCount) {
        let oldestWorker = null;
        let oldestIndex = null;
        for (let i3 = 0; i3 < this.workers.length; i3++) {
          const worker2 = this.workers[i3];
          if (!worker2.running && worker2.pendingSlices.length === 0 && (!oldestWorker || worker2.age < oldestWorker.age)) {
            oldestIndex = i3;
            oldestWorker = worker2;
          }
        }
        if (oldestWorker) {
          assert(oldestIndex !== null);
          assert(oldestWorker.pendingSlices.length === 0);
          this.workers.splice(oldestIndex, 1);
          this.options.onIdleWorkerRemoved?.(oldestWorker);
        } else {
          return null;
        }
      }
      const worker = {
        startPos,
        currentPos: startPos,
        targetPos,
        strictTarget,
        running: false,
        // Due to async shenanigans, it can happen that workers are started after disposal. In this case, instead of
        // simply not creating the worker, we allow it to run but immediately label it as aborted, so it can then
        // shut itself down.
        aborted: this.disposed,
        pendingSlices: [],
        age: this.nextAge++
      };
      this.workers.push(worker);
      return worker;
    }
    runWorker(worker) {
      assert(!worker.running);
      assert(worker.currentPos < worker.targetPos);
      worker.running = true;
      worker.age = this.nextAge++;
      void this.options.runWorker(worker).catch((error) => {
        worker.running = false;
        if (worker.pendingSlices.length > 0) {
          worker.pendingSlices.forEach((x2) => x2.reject(error));
          worker.pendingSlices.length = 0;
        } else if (!worker.aborted && !this.disposed) {
          if (this.options.handleUnhandledError) {
            this.options.handleUnhandledError(error);
          } else {
            throw error;
          }
        }
      }).finally(() => {
        if (worker.running) {
          return;
        }
        if (this.queuedReads.length > 0) {
          let oldestIndex = 0;
          for (let i3 = 1; i3 < this.queuedReads.length; i3++) {
            const queuedRead2 = this.queuedReads[i3];
            if (queuedRead2.age < this.queuedReads[oldestIndex].age) {
              oldestIndex = i3;
            }
          }
          const queuedRead = this.queuedReads[oldestIndex];
          const newWorker = this.createWorker(queuedRead.hole.start, queuedRead.hole.end, queuedRead.strictTarget);
          if (!newWorker) {
            return;
          }
          this.queuedReads.splice(oldestIndex, 1);
          newWorker.pendingSlices = queuedRead.pendingSlices;
          this.runWorker(newWorker);
        }
      });
    }
    /** Called by a worker when it has read some data. */
    supplyWorkerData(worker, bytes) {
      assert(!worker.aborted);
      const start = worker.currentPos;
      const end = start + bytes.length;
      this.insertIntoCache({
        start,
        end,
        bytes,
        view: toDataView(bytes),
        age: this.nextAge++
      });
      worker.currentPos += bytes.length;
      if (worker.currentPos > worker.targetPos) {
        worker.targetPos = worker.currentPos;
        this.checkQueuedReadsAgainstWorker(worker);
      }
      for (let i3 = 0; i3 < worker.pendingSlices.length; i3++) {
        const pendingSlice = worker.pendingSlices[i3];
        const clampedStart = Math.max(start, pendingSlice.start);
        const clampedEnd = Math.min(end, pendingSlice.start + pendingSlice.bytes.length);
        if (clampedStart < clampedEnd) {
          pendingSlice.bytes.set(bytes.subarray(clampedStart - start, clampedEnd - start), clampedStart - pendingSlice.start);
        }
        for (let j3 = 0; j3 < pendingSlice.holes.length; j3++) {
          const hole = pendingSlice.holes[j3];
          if (start <= hole.start && end > hole.start) {
            hole.start = end;
          }
          if (hole.end <= hole.start) {
            pendingSlice.holes.splice(j3, 1);
            j3--;
          }
        }
        if (pendingSlice.holes.length === 0) {
          pendingSlice.resolve(pendingSlice.bytes);
          worker.pendingSlices.splice(i3, 1);
          i3--;
        }
      }
      for (let i3 = 0; i3 < this.workers.length; i3++) {
        const otherWorker = this.workers[i3];
        if (worker === otherWorker || otherWorker.running) {
          continue;
        }
        if (closedIntervalsOverlap(start, end, otherWorker.currentPos, otherWorker.targetPos)) {
          this.workers.splice(i3, 1);
          this.options.onIdleWorkerRemoved?.(otherWorker);
          i3--;
        }
      }
    }
    supplyFileSize(size) {
      assert(this.fileSize === null);
      this.fileSize = size;
      for (const worker of this.workers) {
        worker.targetPos = Math.min(worker.targetPos, size);
        worker.strictTarget = true;
        for (let i3 = 0; i3 < worker.pendingSlices.length; i3++) {
          const pendingSlice = worker.pendingSlices[i3];
          for (const hole of pendingSlice.holes) {
            if (hole.end > size) {
              pendingSlice.resolve(null);
              worker.pendingSlices.splice(i3, 1);
              i3--;
              break;
            }
          }
        }
      }
      for (let i3 = 0; i3 < this.queuedReads.length; i3++) {
        const queuedRead = this.queuedReads[i3];
        if (queuedRead.hole.start >= size) {
          for (const slice of queuedRead.pendingSlices)
            slice.resolve(null);
          this.queuedReads.splice(i3, 1);
          i3--;
        } else if (queuedRead.hole.end > size) {
          queuedRead.hole.end = size;
          queuedRead.strictTarget = true;
          for (let j3 = 0; j3 < queuedRead.pendingSlices.length; j3++) {
            const slice = queuedRead.pendingSlices[j3];
            if (slice.start >= size) {
              slice.resolve(null);
              queuedRead.pendingSlices.splice(j3, 1);
              j3--;
            }
          }
        }
      }
    }
    signalWorkerStoppedRunning(worker) {
      worker.running = false;
      if (!worker.aborted) {
        worker.pendingSlices.length = 0;
      }
    }
    /** Called when a worker reaches the end of the underlying data and must be cleaned up. */
    onWorkerFinished(worker) {
      const index = this.workers.indexOf(worker);
      assert(index !== -1);
      worker.running = false;
      this.workers.splice(index, 1);
      this.options.onIdleWorkerRemoved?.(worker);
      if (this.fileSize === null) {
        this.supplyFileSize(worker.currentPos);
      }
      for (const pendingSlice of worker.pendingSlices) {
        pendingSlice.resolve(null);
      }
    }
    insertIntoCache(entry) {
      if (this.options.maxCacheSize === 0) {
        return;
      }
      let insertionIndex = binarySearchLessOrEqual(this.cache, entry.start, (x2) => x2.start) + 1;
      if (insertionIndex > 0) {
        const previous = this.cache[insertionIndex - 1];
        if (previous.end >= entry.end) {
          return;
        }
        if (previous.end > entry.start) {
          const joined = new Uint8Array(entry.end - previous.start);
          joined.set(previous.bytes, 0);
          joined.set(entry.bytes, entry.start - previous.start);
          this.currentCacheSize += entry.end - previous.end;
          previous.bytes = joined;
          previous.view = toDataView(joined);
          previous.end = entry.end;
          insertionIndex--;
          entry = previous;
        } else {
          this.cache.splice(insertionIndex, 0, entry);
          this.currentCacheSize += entry.bytes.length;
        }
      } else {
        this.cache.splice(insertionIndex, 0, entry);
        this.currentCacheSize += entry.bytes.length;
      }
      for (let i3 = insertionIndex + 1; i3 < this.cache.length; i3++) {
        const next = this.cache[i3];
        if (entry.end <= next.start) {
          break;
        }
        if (entry.end >= next.end) {
          this.cache.splice(i3, 1);
          this.currentCacheSize -= next.bytes.length;
          i3--;
          continue;
        }
        const joined = new Uint8Array(next.end - entry.start);
        joined.set(entry.bytes, 0);
        joined.set(next.bytes, next.start - entry.start);
        this.currentCacheSize -= entry.end - next.start;
        entry.bytes = joined;
        entry.view = toDataView(joined);
        entry.end = next.end;
        this.cache.splice(i3, 1);
        break;
      }
      while (this.currentCacheSize > this.options.maxCacheSize) {
        let oldestIndex = 0;
        let oldestEntry = this.cache[0];
        for (let i3 = 1; i3 < this.cache.length; i3++) {
          const entry2 = this.cache[i3];
          if (entry2.age < oldestEntry.age) {
            oldestIndex = i3;
            oldestEntry = entry2;
          }
        }
        if (this.currentCacheSize - oldestEntry.bytes.length <= this.options.maxCacheSize) {
          break;
        }
        this.cache.splice(oldestIndex, 1);
        this.currentCacheSize -= oldestEntry.bytes.length;
      }
    }
    dispose() {
      for (const worker of this.workers) {
        for (const slice of worker.pendingSlices) {
          slice.reject(new InputDisposedError());
        }
        worker.pendingSlices.length = 0;
        worker.aborted = true;
        if (!worker.running) {
          this.options.onIdleWorkerRemoved?.(worker);
        }
      }
      for (const queuedRead of this.queuedReads) {
        for (const slice of queuedRead.pendingSlices) {
          slice.reject(new InputDisposedError());
        }
      }
      this.workers.length = 0;
      this.cache.length = 0;
      this.queuedReads.length = 0;
      this.disposed = true;
    }
  };
  var RangedSource = class extends Source {
    /** @internal */
    constructor(baseSource, offset, length) {
      super();
      this._ref = null;
      if (baseSource._disposed) {
        throw new Error("Cannot create a slice of a disposed source.");
      }
      this._baseSource = baseSource;
      this._offset = offset;
      this._length = length ?? null;
    }
    /** @internal */
    _getFileSize() {
      const baseSize = this._baseSource._getFileSize();
      if (baseSize === void 0) {
        return this._length !== null ? this._length : void 0;
      }
      if (baseSize === null) {
        if (this._length !== null) {
          return this._length;
        } else {
          return null;
        }
      }
      return clamp5(baseSize - this._offset, 0, this._length ?? Infinity);
    }
    /** @internal */
    _read(start, end, minReadPosition, maxReadPosition) {
      if (this._length !== null && end > this._length) {
        return null;
      }
      const result = this._baseSource._read(this._offset + start, this._offset + end, this._offset + minReadPosition, this._offset + maxReadPosition);
      const processResult = (result2) => {
        if (!result2) {
          return null;
        }
        result2.offset -= this._offset;
        return result2;
      };
      if (isThenable(result)) {
        return result.then(processResult);
      } else {
        return processResult(result);
      }
    }
    /** @internal */
    _dispose() {
      this._ref?.free();
    }
    ref() {
      this._ref ??= this._baseSource.ref();
      return super.ref();
    }
  };

  // node_modules/mediabunny/dist/modules/src/input-format.js
  var InputFormat = class {
    constructor() {
      this._isIsobmff = false;
    }
  };
  var IsobmffInputFormat = class extends InputFormat {
    constructor() {
      super(...arguments);
      this._isIsobmff = true;
    }
    /** @internal */
    async _getMajorBrand(input) {
      let slice = input._reader.requestSlice(0, 12);
      if (isThenable(slice))
        slice = await slice;
      if (!slice)
        return null;
      slice.skip(4);
      const fourCc = readAscii(slice, 4);
      if (fourCc !== "ftyp" && fourCc !== "styp") {
        return null;
      }
      return readAscii(slice, 4);
    }
    /** @internal */
    _createDemuxer(input) {
      return new IsobmffDemuxer(input);
    }
  };
  var Mp4InputFormat = class extends IsobmffInputFormat {
    /** @internal */
    async _canReadInput(input) {
      const majorBrand = await this._getMajorBrand(input);
      if (majorBrand !== null) {
        return majorBrand !== "qt  ";
      }
      let pos = 0;
      for (let iter = 0; iter < 10; iter++) {
        let slice = input._reader.requestSlice(pos, 8);
        if (isThenable(slice))
          slice = await slice;
        if (!slice)
          return false;
        let size = readU32Be(slice);
        let headerSize = 8;
        if (size === 1) {
          let sizeExtensionSlice = input._reader.requestSlice(pos + 8, 8);
          if (isThenable(sizeExtensionSlice))
            sizeExtensionSlice = await sizeExtensionSlice;
          if (!sizeExtensionSlice)
            return false;
          size = readU64Be(sizeExtensionSlice);
          headerSize = 16;
        }
        if (size < headerSize) {
          return false;
        }
        const fourCc = readAscii(slice, 4);
        if (fourCc === "moof" || fourCc === "sidx") {
          return true;
        } else if (fourCc === "emsg" || fourCc === "prft" || fourCc === "free") {
          pos += size;
        } else {
          return false;
        }
      }
      return false;
    }
    get name() {
      return "MP4";
    }
    get mimeType() {
      return "video/mp4";
    }
  };
  var MP4 = /* @__PURE__ */ new Mp4InputFormat();
  var validateInputFormatOptions = (options, prefix) => {
    if (!options || typeof options !== "object") {
      throw new TypeError(`${prefix}, when provided, must be an object.`);
    }
    if (options.isobmff !== void 0) {
      if (!options.isobmff || typeof options.isobmff !== "object") {
        throw new TypeError(`${prefix}.isobmff, when provided, must be an object.`);
      }
      if (options.isobmff.resolveKeyId !== void 0 && typeof options.isobmff.resolveKeyId !== "function") {
        throw new TypeError(`${prefix}.isobmff.resolveKeyId, when provided, must be a function.`);
      }
    }
    if (options.hls !== void 0) {
      if (!options.hls || typeof options.hls !== "object") {
        throw new TypeError(`${prefix}.hls, when provided, must be an object.`);
      }
      if (options.hls.offsetTimestampsByDateTime !== void 0 && typeof options.hls.offsetTimestampsByDateTime !== "boolean") {
        throw new TypeError(`${prefix}.hls.offsetTimestampsByDateTime, when provided, must be a boolean.`);
      }
    }
  };

  // node_modules/mediabunny/dist/modules/src/sample.js
  var __addDisposableResource = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e3) {
          return Promise.reject(e3);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources = /* @__PURE__ */ (function(SuppressedError2) {
    return function(env) {
      function fail(e3) {
        env.error = env.hasError ? new SuppressedError2(e3, env.error, "An error was suppressed during disposal.") : e3;
        env.hasError = true;
      }
      var r3, s3 = 0;
      function next() {
        while (r3 = env.stack.pop()) {
          try {
            if (!r3.async && s3 === 1) return s3 = 0, env.stack.push(r3), Promise.resolve().then(next);
            if (r3.dispose) {
              var result = r3.dispose.call(r3.value);
              if (r3.async) return s3 |= 2, Promise.resolve(result).then(next, function(e3) {
                fail(e3);
                return next();
              });
            } else s3 |= 1;
          } catch (e3) {
            fail(e3);
          }
        }
        if (s3 === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  })(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
    var e3 = new Error(message);
    return e3.name = "SuppressedError", e3.error = error, e3.suppressed = suppressed, e3;
  });
  polyfillSymbolDispose();
  var lastVideoGcErrorLog = -Infinity;
  var lastAudioGcErrorLog = -Infinity;
  var finalizationRegistry = null;
  if (typeof FinalizationRegistry !== "undefined") {
    finalizationRegistry = new FinalizationRegistry((value) => {
      const now = performance.now();
      if (value.type === "video") {
        if (now - lastVideoGcErrorLog >= 1e3) {
          Logging._error(`A VideoSample was garbage collected without first being closed. For proper resource management, make sure to call close() on all your VideoSamples as soon as you're done using them.`);
          lastVideoGcErrorLog = now;
        }
        if (typeof VideoFrame !== "undefined" && value.data instanceof VideoFrame) {
          value.data.close();
        }
      } else {
        if (now - lastAudioGcErrorLog >= 1e3) {
          Logging._error(`An AudioSample was garbage collected without first being closed. For proper resource management, make sure to call close() on all your AudioSamples as soon as you're done using them.`);
          lastAudioGcErrorLog = now;
        }
        if (typeof AudioData !== "undefined" && value.data instanceof AudioData) {
          value.data.close();
        }
      }
    });
  }
  var VideoSampleResource = class {
    constructor() {
      this._referenceCount = 0;
      this._lastAllocationBuffer = null;
    }
  };
  var VIDEO_SAMPLE_PIXEL_FORMATS = [
    // 4:2:0 Y, U, V
    "I420",
    "I420P10",
    "I420P12",
    // 4:2:0 Y, U, V, A
    "I420A",
    "I420AP10",
    "I420AP12",
    // 4:2:2 Y, U, V
    "I422",
    "I422P10",
    "I422P12",
    // 4:2:2 Y, U, V, A
    "I422A",
    "I422AP10",
    "I422AP12",
    // 4:4:4 Y, U, V
    "I444",
    "I444P10",
    "I444P12",
    // 4:4:4 Y, U, V, A
    "I444A",
    "I444AP10",
    "I444AP12",
    // 4:2:0 Y, UV
    "NV12",
    // 4:4:4 RGBA
    "RGBA",
    // 4:4:4 RGBX (opaque)
    "RGBX",
    // 4:4:4 BGRA
    "BGRA",
    // 4:4:4 BGRX (opaque)
    "BGRX"
  ];
  var VIDEO_SAMPLE_PIXEL_FORMATS_SET = new Set(VIDEO_SAMPLE_PIXEL_FORMATS);
  var VideoSample = class _VideoSample {
    /** The width of the frame in pixels. */
    get codedWidth() {
      return this.visibleRect.width;
    }
    /** The height of the frame in pixels. */
    get codedHeight() {
      return this.visibleRect.height;
    }
    /** The display width of the frame in pixels, after aspect ratio adjustment, rotation and flip. */
    get displayWidth() {
      return this.rotation % 180 === 0 ? this.squarePixelWidth : this.squarePixelHeight;
    }
    /** The display height of the frame in pixels, after aspect ratio adjustment, rotation and flip. */
    get displayHeight() {
      return this.rotation % 180 === 0 ? this.squarePixelHeight : this.squarePixelWidth;
    }
    /** The presentation timestamp of the frame in microseconds. */
    get microsecondTimestamp() {
      return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.timestamp);
    }
    /** The duration of the frame in microseconds. */
    get microsecondDuration() {
      return Math.trunc(SECOND_TO_MICROSECOND_FACTOR * this.duration);
    }
    /**
     * Whether this sample uses a pixel format that can hold transparency data. Note that this doesn't necessarily mean
     * that the sample is transparent.
     */
    get hasAlpha() {
      return this.format && this.format.includes("A");
    }
    constructor(data, init) {
      this._closed = false;
      if (data instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && data instanceof SharedArrayBuffer || ArrayBuffer.isView(data)) {
        if (!init || typeof init !== "object") {
          throw new TypeError("init must be an object.");
        }
        if (init.format === void 0 || !VIDEO_SAMPLE_PIXEL_FORMATS_SET.has(init.format)) {
          throw new TypeError("init.format must be one of: " + VIDEO_SAMPLE_PIXEL_FORMATS.join(", "));
        }
        if (!Number.isInteger(init.codedWidth) || init.codedWidth <= 0) {
          throw new TypeError("init.codedWidth must be a positive integer.");
        }
        if (!Number.isInteger(init.codedHeight) || init.codedHeight <= 0) {
          throw new TypeError("init.codedHeight must be a positive integer.");
        }
        if (init.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
          throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
        }
        if (init.flip !== void 0 && typeof init.flip !== "boolean") {
          throw new TypeError("init.flip, when provided, must be a boolean.");
        }
        if (!Number.isFinite(init.timestamp)) {
          throw new TypeError("init.timestamp must be a number.");
        }
        if (init.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
          throw new TypeError("init.duration, when provided, must be a non-negative number.");
        }
        if (init.layout !== void 0) {
          if (!Array.isArray(init.layout)) {
            throw new TypeError("init.layout, when provided, must be an array.");
          }
          for (const plane of init.layout) {
            if (!plane || typeof plane !== "object" || Array.isArray(plane)) {
              throw new TypeError("Each entry in init.layout must be an object.");
            }
            if (!Number.isInteger(plane.offset) || plane.offset < 0) {
              throw new TypeError("plane.offset must be a non-negative integer.");
            }
            if (!Number.isInteger(plane.stride) || plane.stride < 0) {
              throw new TypeError("plane.stride must be a non-negative integer.");
            }
          }
        }
        if (init.visibleRect !== void 0) {
          validateRectangle(init.visibleRect, "init.visibleRect");
        }
        if (init.displayWidth !== void 0 && (!Number.isInteger(init.displayWidth) || init.displayWidth <= 0)) {
          throw new TypeError("init.displayWidth, when provided, must be a positive integer.");
        }
        if (init.displayHeight !== void 0 && (!Number.isInteger(init.displayHeight) || init.displayHeight <= 0)) {
          throw new TypeError("init.displayHeight, when provided, must be a positive integer.");
        }
        if (init.displayWidth !== void 0 !== (init.displayHeight !== void 0)) {
          throw new TypeError("init.displayWidth and init.displayHeight must be either both provided or both omitted.");
        }
        this.format = init.format;
        this.rotation = init.rotation ?? 0;
        this.flip = init.flip ?? false;
        this.timestamp = init.timestamp;
        this.duration = init.duration ?? 0;
        const layout = init.layout ?? createDefaultPlaneLayout(init.format, init.codedWidth, init.codedHeight);
        let colorSpaceInit = init.colorSpace ?? null;
        if (colorSpaceInit === null) {
          if (this.format === "RGBA" || this.format === "RGBX" || this.format === "BGRA" || this.format === "BGRX") {
            colorSpaceInit = {
              primaries: "bt709",
              transfer: "iec61966-2-1",
              matrix: "rgb",
              fullRange: true
            };
          } else {
            colorSpaceInit = {
              primaries: "bt709",
              transfer: "bt709",
              matrix: "bt709",
              fullRange: false
            };
          }
        }
        this.visibleRect = {
          left: init.visibleRect?.left ?? 0,
          top: init.visibleRect?.top ?? 0,
          width: init.visibleRect?.width ?? init.codedWidth,
          height: init.visibleRect?.height ?? init.codedHeight
        };
        if (init.displayWidth !== void 0) {
          this.squarePixelWidth = this.rotation % 180 === 0 ? init.displayWidth : init.displayHeight;
          this.squarePixelHeight = this.rotation % 180 === 0 ? init.displayHeight : init.displayWidth;
        } else {
          this.squarePixelWidth = this.visibleRect.width;
          this.squarePixelHeight = this.visibleRect.height;
        }
        this._data = init._doNotCopy ? toUint8Array(data) : toUint8Array(data).slice();
        this._layout = layout;
        this.colorSpace = new VideoSampleColorSpace(colorSpaceInit);
      } else if (typeof VideoFrame !== "undefined" && data instanceof VideoFrame) {
        if (init?.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
          throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
        }
        if (init?.flip !== void 0 && typeof init.flip !== "boolean") {
          throw new TypeError("init.flip, when provided, must be a boolean.");
        }
        if (init?.timestamp !== void 0 && !Number.isFinite(init?.timestamp)) {
          throw new TypeError("init.timestamp, when provided, must be a number.");
        }
        if (init?.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
          throw new TypeError("init.duration, when provided, must be a non-negative number.");
        }
        if (init?.visibleRect !== void 0) {
          validateRectangle(init.visibleRect, "init.visibleRect");
        }
        this._data = data;
        this._layout = null;
        this.format = data.format;
        this.visibleRect = {
          left: data.visibleRect?.x ?? 0,
          top: data.visibleRect?.y ?? 0,
          width: data.visibleRect?.width ?? data.codedWidth,
          height: data.visibleRect?.height ?? data.codedHeight
        };
        this.rotation = init?.rotation ?? 0;
        this.flip = init?.flip ?? false;
        this.squarePixelWidth = data.displayWidth;
        this.squarePixelHeight = data.displayHeight;
        this.timestamp = init?.timestamp ?? data.timestamp / 1e6;
        this.duration = init?.duration ?? (data.duration ?? 0) / 1e6;
        const { primaries, transfer, matrix, fullRange } = data.colorSpace;
        this.colorSpace = new VideoSampleColorSpace({
          primaries: primaries !== null && primaries in COLOR_PRIMARIES_MAP ? primaries : null,
          transfer: transfer !== null && transfer in TRANSFER_CHARACTERISTICS_MAP ? transfer : null,
          matrix: matrix !== null && matrix in MATRIX_COEFFICIENTS_MAP ? matrix : null,
          fullRange
        });
      } else if (typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement || typeof SVGImageElement !== "undefined" && data instanceof SVGImageElement || typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap || typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement || typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas) {
        if (!init || typeof init !== "object") {
          throw new TypeError("init must be an object.");
        }
        if (init.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
          throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
        }
        if (init.flip !== void 0 && typeof init.flip !== "boolean") {
          throw new TypeError("init.flip, when provided, must be a boolean.");
        }
        if (!Number.isFinite(init.timestamp)) {
          throw new TypeError("init.timestamp must be a number.");
        }
        if (init.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
          throw new TypeError("init.duration, when provided, must be a non-negative number.");
        }
        if (init.visibleRect !== void 0) {
          validateRectangle(init.visibleRect, "init.visibleRect");
        }
        if (typeof VideoFrame !== "undefined") {
          return new _VideoSample(new VideoFrame(data, {
            timestamp: Math.trunc(init.timestamp * SECOND_TO_MICROSECOND_FACTOR),
            // Drag 0 to undefined
            duration: Math.trunc((init.duration ?? 0) * SECOND_TO_MICROSECOND_FACTOR) || void 0,
            // WebCodecs wants DOMRectInit
            visibleRect: init.visibleRect && {
              x: init.visibleRect.left,
              y: init.visibleRect.top,
              width: init.visibleRect.width,
              height: init.visibleRect.height
            }
          }), init);
        }
        let width = 0;
        let height = 0;
        if ("naturalWidth" in data) {
          width = data.naturalWidth;
          height = data.naturalHeight;
        } else if ("videoWidth" in data) {
          width = data.videoWidth;
          height = data.videoHeight;
        } else if ("width" in data) {
          width = Number(data.width);
          height = Number(data.height);
        }
        if (!width || !height) {
          throw new TypeError("Could not determine dimensions.");
        }
        const visibleRect = init.visibleRect ?? { left: 0, top: 0, width, height };
        const canvas = new OffscreenCanvas(visibleRect.width, visibleRect.height);
        const context = canvas.getContext("2d", {
          alpha: isFirefox(),
          // Firefox has VideoFrame glitches with opaque canvases
          willReadFrequently: true
        });
        if (!context) {
          throw new Error("OffscreenCanvas must have support for the '2d' context in order to create a VideoSample from this data.");
        }
        context.drawImage(data, -visibleRect.left, -visibleRect.top);
        this._data = canvas;
        this._layout = null;
        this.format = "RGBX";
        this.visibleRect = { left: 0, top: 0, width: visibleRect.width, height: visibleRect.height };
        this.squarePixelWidth = visibleRect.width;
        this.squarePixelHeight = visibleRect.height;
        this.rotation = init.rotation ?? 0;
        this.flip = init.flip ?? false;
        this.timestamp = init.timestamp;
        this.duration = init.duration ?? 0;
        this.colorSpace = new VideoSampleColorSpace({
          matrix: "rgb",
          primaries: "bt709",
          transfer: "iec61966-2-1",
          fullRange: true
        });
      } else if (data instanceof VideoSampleResource) {
        if (!init || typeof init !== "object") {
          throw new TypeError("init must be an object.");
        }
        if (init.rotation !== void 0 && ![0, 90, 180, 270].includes(init.rotation)) {
          throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");
        }
        if (init.flip !== void 0 && typeof init.flip !== "boolean") {
          throw new TypeError("init.flip, when provided, must be a boolean.");
        }
        if (!Number.isFinite(init.timestamp)) {
          throw new TypeError("init.timestamp must be a number.");
        }
        if (init.duration !== void 0 && (!Number.isFinite(init.duration) || init.duration < 0)) {
          throw new TypeError("init.duration, when provided, must be a non-negative number.");
        }
        this._data = data;
        data._referenceCount++;
        this.format = data.getFormat();
        if (this.format !== null && !VIDEO_SAMPLE_PIXEL_FORMATS.includes(this.format)) {
          throw new TypeError("getFormat() must return a VideoSamplePixelFormat or null.");
        }
        this.visibleRect = {
          left: 0,
          top: 0,
          width: data.getCodedWidth(),
          height: data.getCodedHeight()
        };
        if (!Number.isInteger(this.visibleRect.width) || this.visibleRect.width <= 0) {
          throw new TypeError("getCodedWidth() must return a positive integer.");
        }
        if (!Number.isInteger(this.visibleRect.height) || this.visibleRect.height <= 0) {
          throw new TypeError("getCodedHeight() must return a positive integer.");
        }
        this.squarePixelWidth = data.getSquarePixelWidth();
        if (!Number.isInteger(this.squarePixelWidth) || this.squarePixelWidth <= 0) {
          throw new TypeError("getSquarePixelWidth() must return a positive integer.");
        }
        this.squarePixelHeight = data.getSquarePixelHeight();
        if (!Number.isInteger(this.squarePixelHeight) || this.squarePixelHeight <= 0) {
          throw new TypeError("getSquarePixelHeight() must return a positive integer.");
        }
        this.rotation = init.rotation ?? 0;
        this.flip = init.flip ?? false;
        this.timestamp = init.timestamp;
        this.duration = init.duration ?? 0;
        this.colorSpace = data.getColorSpace();
      } else {
        throw new TypeError("Invalid data type: Must be a BufferSource, CanvasImageSource, or VideoSampleResource.");
      }
      this.encodeOptions = init?.encodeOptions ?? {};
      this.pixelAspectRatio = simplifyRational({
        num: this.squarePixelWidth * this.codedHeight,
        den: this.squarePixelHeight * this.codedWidth
      });
      finalizationRegistry?.register(this, { type: "video", data: this._data }, this);
    }
    /** Clones this video sample. */
    clone() {
      if (this._closed) {
        throw new Error("VideoSample is closed.");
      }
      assert(this._data !== null);
      if (this._data instanceof VideoSampleResource) {
        return new _VideoSample(this._data, {
          timestamp: this.timestamp,
          duration: this.duration,
          rotation: this.rotation,
          flip: this.flip,
          encodeOptions: this.encodeOptions
        });
      } else if (isVideoFrame(this._data)) {
        return new _VideoSample(this._data.clone(), {
          timestamp: this.timestamp,
          duration: this.duration,
          rotation: this.rotation,
          flip: this.flip,
          encodeOptions: this.encodeOptions
        });
      } else if (this._data instanceof Uint8Array) {
        assert(this._layout);
        return new _VideoSample(this._data, {
          format: this.format,
          layout: this._layout,
          codedWidth: this.codedWidth,
          codedHeight: this.codedHeight,
          timestamp: this.timestamp,
          duration: this.duration,
          colorSpace: this.colorSpace,
          rotation: this.rotation,
          flip: this.flip,
          visibleRect: this.visibleRect,
          displayWidth: this.displayWidth,
          displayHeight: this.displayHeight,
          encodeOptions: this.encodeOptions,
          // It's already been copied, if we copy it again we make the clone unnecessarily expensive
          _doNotCopy: true
        });
      } else {
        return new _VideoSample(this._data, {
          format: this.format,
          codedWidth: this.codedWidth,
          codedHeight: this.codedHeight,
          timestamp: this.timestamp,
          duration: this.duration,
          colorSpace: this.colorSpace,
          rotation: this.rotation,
          flip: this.flip,
          visibleRect: this.visibleRect,
          displayWidth: this.displayWidth,
          displayHeight: this.displayHeight,
          encodeOptions: this.encodeOptions
        });
      }
    }
    /**
     * Closes this video sample, releasing held resources. Video samples should be closed as soon as they are not
     * needed anymore.
     */
    close() {
      if (this._closed) {
        return;
      }
      finalizationRegistry?.unregister(this);
      if (this._data instanceof VideoSampleResource) {
        this._data._referenceCount--;
        if (this._data._referenceCount === 0) {
          this._data.close();
        }
      } else if (isVideoFrame(this._data)) {
        this._data.close();
      } else {
        this._data = null;
      }
      this._closed = true;
    }
    /**
     * Returns the number of bytes required to hold this video sample's pixel data.
     */
    allocationSize(options = {}) {
      validateVideoFrameCopyToOptions(options);
      if (this._closed) {
        throw new Error("VideoSample is closed.");
      }
      if ((options.format ?? this.format) == null) {
        throw new Error("Cannot get allocation size when format is null.");
      }
      if (isVideoFrame(this._data)) {
        return this._data.allocationSize(options);
      }
      const combinedLayout = ParseVideoFrameCopyToOptions(this, options);
      return combinedLayout.allocationSize;
    }
    /**
     * Copies this video sample's pixel data to an ArrayBuffer or ArrayBufferView.
     * @returns The byte layout of the planes of the copied data.
     */
    async copyTo(destination, options = {}) {
      if (!isAllowSharedBufferSource(destination)) {
        throw new TypeError("destination must be an ArrayBuffer or an ArrayBuffer view.");
      }
      validateVideoFrameCopyToOptions(options);
      if (this._closed) {
        throw new Error("VideoSample is closed.");
      }
      if ((options.format ?? this.format) == null) {
        throw new Error("Cannot copy video sample data when format is null.");
      }
      assert(this._data !== null);
      if (isVideoFrame(this._data)) {
        return this._data.copyTo(destination, options);
      }
      if (options.format && !["RGBA", "RGBX", "BGRA", "BGRX"].includes(this.format) && ["RGBA", "RGBX", "BGRA", "BGRX"].includes(options.format)) {
        if (this._data instanceof VideoSampleResource) {
          const env_1 = { stack: [], error: void 0, hasError: false };
          try {
            const rgbSample = __addDisposableResource(env_1, await this._data.toRgbSample({
              timestamp: this.timestamp,
              duration: this.duration,
              rotation: this.rotation,
              flip: this.flip
            }, options.colorSpace ?? "srgb"), false);
            if (!(rgbSample instanceof _VideoSample)) {
              throw new TypeError("toRgbSample() must return a VideoSample.");
            }
            if (!["RGBA", "RGBX", "BGRA", "BGRX"].includes(rgbSample.format)) {
              throw new Error(`Sample returned by toRgbSample was expected to have an RGB format, got '${rgbSample.format}' instead.`);
            }
            return await rgbSample.copyTo(destination, options);
          } catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
          } finally {
            __disposeResources(env_1);
          }
        } else {
          if (typeof VideoFrame === "undefined") {
            throw new Error("For this sample, converting from a non-RGB to an RGB format requires VideoFrame to be defined.");
          }
          const tempFrame = this.toVideoFrame();
          const result = await tempFrame.copyTo(destination, options);
          tempFrame.close();
          return result;
        }
      }
      const combinedLayout = ParseVideoFrameCopyToOptions(this, options);
      assert(this.format);
      const destBytes = toUint8Array(destination);
      if (destBytes.byteLength < combinedLayout.allocationSize) {
        throw new TypeError(`Destination buffer too small. Required: ${combinedLayout.allocationSize}, Available: ${destBytes.byteLength}`);
      }
      const planeConfigs = getPlaneConfigs(this.format);
      let dataPlanes;
      if (this._data instanceof VideoSampleResource) {
        let result = this._data.getDataPlanes();
        if (isThenable(result))
          result = await result;
        if (!Array.isArray(result) || result.some((x2) => !(x2.data instanceof Uint8Array) || !Number.isInteger(x2.stride) || x2.stride < 0)) {
          throw new TypeError('getDataPlanes() must return an array of objects with a Uint8Array "data" property and a non-negative integer "stride" property.');
        }
        dataPlanes = result;
      } else if (this._data instanceof Uint8Array) {
        assert(this._layout);
        assert(this._layout.length === planeConfigs.length);
        dataPlanes = this._layout.map((planeLayout, i3) => {
          const height = Math.ceil(this.codedHeight / planeConfigs[i3].heightDivisor);
          return {
            data: this._data.subarray(planeLayout.offset, planeLayout.offset + planeLayout.stride * height),
            stride: planeLayout.stride
          };
        });
      } else {
        const canvas = this._data;
        const context = canvas.getContext("2d");
        assert(context);
        const imageData = context.getImageData(0, 0, this.codedWidth, this.codedHeight);
        dataPlanes = [{
          data: toUint8Array(imageData.data),
          stride: 4 * this.codedWidth
        }];
      }
      const planeLayouts = [];
      const numPlanes = planeConfigs.length;
      for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
        const computedLayout = combinedLayout.computedLayouts[planeIndex];
        const sourceStride = dataPlanes[planeIndex].stride;
        const sourceData = dataPlanes[planeIndex].data;
        let sourceOffset = computedLayout.sourceTop * sourceStride;
        sourceOffset += computedLayout.sourceLeftBytes;
        let destinationOffset = computedLayout.destinationOffset;
        const rowBytes = computedLayout.sourceWidthBytes;
        const layout = {
          offset: destinationOffset,
          stride: computedLayout.destinationStride
        };
        for (let row = 0; row < computedLayout.sourceHeight; row++) {
          if (sourceOffset + rowBytes > sourceData.byteLength) {
            throw new Error(`Source buffer OOB read.`);
          }
          if (destinationOffset + rowBytes > destBytes.byteLength) {
            throw new Error(`Destination buffer OOB write.`);
          }
          const srcSub = sourceData.subarray(sourceOffset, sourceOffset + rowBytes);
          destBytes.set(srcSub, destinationOffset);
          sourceOffset += sourceStride;
          destinationOffset += computedLayout.destinationStride;
        }
        planeLayouts.push(layout);
      }
      if (options.format !== void 0) {
        const needsRgbConversion = this.format.startsWith("RGB") !== options.format.startsWith("RGB");
        const needsAlphaConversion = this.format.includes("X") && options.format.includes("A");
        if (needsRgbConversion || needsAlphaConversion) {
          for (let i3 = 0; i3 < combinedLayout.allocationSize; i3 += 4) {
            if (needsRgbConversion) {
              const r3 = destBytes[i3];
              const b2 = destBytes[i3 + 2];
              destBytes[i3] = b2;
              destBytes[i3 + 2] = r3;
            }
            if (needsAlphaConversion) {
              destBytes[i3 + 3] = 255;
            }
          }
        }
      }
      return planeLayouts;
    }
    /**
     * Converts this video sample to a VideoFrame for use with the WebCodecs API. The VideoFrame returned by this
     * method *must* be closed separately from this video sample.
     */
    toVideoFrame() {
      if (this._closed) {
        throw new Error("VideoSample is closed.");
      }
      assert(this._data !== null);
      if (this._data instanceof VideoSampleResource) {
        if (this.format === null) {
          throw new Error("Cannot convert a VideoSampleResource-backed VideoSample to VideoFrame if format is null.");
        }
        const planes = this._data.getDataPlanes();
        if (isThenable(planes)) {
          throw new Error("Cannot convert a VideoSampleResource-backed VideoSample to VideoFrame if getDataPlanes() returns a promise.");
        }
        const size = planes.reduce((a3, b2) => a3 + b2.data.byteLength, 0);
        const buffer = new Uint8Array(size);
        let offset = 0;
        const offsets = [];
        for (const plane of planes) {
          buffer.set(plane.data, offset);
          offsets.push(offset);
          offset += plane.data.byteLength;
        }
        return new VideoFrame(buffer, {
          format: this.format,
          layout: planes.map((x2, i3) => ({
            offset: offsets[i3],
            stride: x2.stride
          })),
          codedWidth: this.codedWidth,
          codedHeight: this.codedHeight,
          timestamp: this.microsecondTimestamp,
          duration: this.microsecondDuration,
          colorSpace: this.colorSpace,
          visibleRect: this.visibleRect,
          displayWidth: this.squarePixelWidth,
          // Not display* since we're not passing rotation
          displayHeight: this.squarePixelHeight
        });
      } else if (isVideoFrame(this._data)) {
        return new VideoFrame(this._data, {
          timestamp: this.microsecondTimestamp,
          duration: this.microsecondDuration || void 0
          // Drag 0 duration to undefined, glitches some codecs
        });
      } else if (this._data instanceof Uint8Array) {
        assert(this._layout);
        return new VideoFrame(this._data, {
          format: this.format,
          codedWidth: this.codedWidth,
          // This is technically wrong! codedWidth is a lie technically. But, since
          codedHeight: this.codedHeight,
          // we pass the layout (which contains the true coded width), we're good.
          layout: this._layout,
          timestamp: this.microsecondTimestamp,
          duration: this.microsecondDuration || void 0,
          colorSpace: this.colorSpace,
          visibleRect: this.visibleRect,
          displayWidth: this.squarePixelWidth,
          // Not display* since we're not passing rotation
          displayHeight: this.squarePixelHeight
        });
      } else {
        return new VideoFrame(this._data, {
          timestamp: this.microsecondTimestamp,
          duration: this.microsecondDuration || void 0
        });
      }
    }
    draw(context, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
      let sx = 0;
      let sy = 0;
      let sWidth = this.displayWidth;
      let sHeight = this.displayHeight;
      let dx = 0;
      let dy = 0;
      let dWidth = this.displayWidth;
      let dHeight = this.displayHeight;
      if (arg5 !== void 0) {
        sx = arg1;
        sy = arg2;
        sWidth = arg3;
        sHeight = arg4;
        dx = arg5;
        dy = arg6;
        if (arg7 !== void 0) {
          dWidth = arg7;
          dHeight = arg8;
        } else {
          dWidth = sWidth;
          dHeight = sHeight;
        }
      } else {
        dx = arg1;
        dy = arg2;
        if (arg3 !== void 0) {
          dWidth = arg3;
          dHeight = arg4;
        }
      }
      if (!(typeof CanvasRenderingContext2D !== "undefined" && context instanceof CanvasRenderingContext2D || typeof OffscreenCanvasRenderingContext2D !== "undefined" && context instanceof OffscreenCanvasRenderingContext2D)) {
        throw new TypeError("context must be a CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.");
      }
      if (!Number.isFinite(sx)) {
        throw new TypeError("sx must be a number.");
      }
      if (!Number.isFinite(sy)) {
        throw new TypeError("sy must be a number.");
      }
      if (!Number.isFinite(sWidth) || sWidth < 0) {
        throw new TypeError("sWidth must be a non-negative number.");
      }
      if (!Number.isFinite(sHeight) || sHeight < 0) {
        throw new TypeError("sHeight must be a non-negative number.");
      }
      if (!Number.isFinite(dx)) {
        throw new TypeError("dx must be a number.");
      }
      if (!Number.isFinite(dy)) {
        throw new TypeError("dy must be a number.");
      }
      if (!Number.isFinite(dWidth) || dWidth < 0) {
        throw new TypeError("dWidth must be a non-negative number.");
      }
      if (!Number.isFinite(dHeight) || dHeight < 0) {
        throw new TypeError("dHeight must be a non-negative number.");
      }
      if (this._closed) {
        throw new Error("VideoSample is closed.");
      }
      ({ sx, sy, sWidth, sHeight } = this._unmapSourceRegion(sx, sy, sWidth, sHeight, this.rotation, this.flip));
      const source = this.toCanvasImageSource();
      context.save();
      const centerX = dx + dWidth / 2;
      const centerY = dy + dHeight / 2;
      context.translate(centerX, centerY);
      if (this.flip) {
        context.scale(-1, 1);
      }
      context.rotate(this.rotation * Math.PI / 180);
      const aspectRatioChange = this.rotation % 180 === 0 ? 1 : dWidth / dHeight;
      context.scale(1 / aspectRatioChange, aspectRatioChange);
      context.drawImage(source, sx, sy, sWidth, sHeight, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
      context.restore();
    }
    /**
     * Draws the sample in the middle of the canvas corresponding to the context with the specified fit behavior.
     */
    drawWithFit(context, options) {
      if (!(typeof CanvasRenderingContext2D !== "undefined" && context instanceof CanvasRenderingContext2D || typeof OffscreenCanvasRenderingContext2D !== "undefined" && context instanceof OffscreenCanvasRenderingContext2D)) {
        throw new TypeError("context must be a CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.");
      }
      if (!options || typeof options !== "object") {
        throw new TypeError("options must be an object.");
      }
      if (!["fill", "contain", "cover"].includes(options.fit)) {
        throw new TypeError("options.fit must be 'fill', 'contain', or 'cover'.");
      }
      if (options.rotation !== void 0 && ![0, 90, 180, 270].includes(options.rotation)) {
        throw new TypeError("options.rotation, when provided, must be 0, 90, 180, or 270.");
      }
      if (options.flip !== void 0 && typeof options.flip !== "boolean") {
        throw new TypeError("options.flip, when provided, must be a boolean.");
      }
      if (options.crop !== void 0) {
        validateCropRectangle(options.crop, "options.");
      }
      const canvasWidth = context.canvas.width;
      const canvasHeight = context.canvas.height;
      const rotation = options.rotation ?? this.rotation;
      const flip = options.flip ?? this.flip;
      const [rotatedWidth, rotatedHeight] = rotation % 180 === 0 ? [this.squarePixelWidth, this.squarePixelHeight] : [this.squarePixelHeight, this.squarePixelWidth];
      let finalCrop = options.crop;
      if (finalCrop) {
        finalCrop = clampCropRectangle(finalCrop, rotatedWidth, rotatedHeight);
      }
      let dx;
      let dy;
      let newWidth;
      let newHeight;
      const { sx, sy, sWidth, sHeight } = this._unmapSourceRegion(options.crop?.left ?? 0, options.crop?.top ?? 0, options.crop?.width ?? rotatedWidth, options.crop?.height ?? rotatedHeight, rotation, flip);
      if (options.fit === "fill") {
        dx = 0;
        dy = 0;
        newWidth = canvasWidth;
        newHeight = canvasHeight;
      } else {
        const [sampleWidth, sampleHeight] = options.crop ? [options.crop.width, options.crop.height] : [rotatedWidth, rotatedHeight];
        const scale = options.fit === "contain" ? Math.min(canvasWidth / sampleWidth, canvasHeight / sampleHeight) : Math.max(canvasWidth / sampleWidth, canvasHeight / sampleHeight);
        newWidth = sampleWidth * scale;
        newHeight = sampleHeight * scale;
        dx = (canvasWidth - newWidth) / 2;
        dy = (canvasHeight - newHeight) / 2;
      }
      context.save();
      const aspectRatioChange = rotation % 180 === 0 ? 1 : newWidth / newHeight;
      context.translate(canvasWidth / 2, canvasHeight / 2);
      if (flip) {
        context.scale(-1, 1);
      }
      context.rotate(rotation * Math.PI / 180);
      context.scale(1 / aspectRatioChange, aspectRatioChange);
      context.translate(-canvasWidth / 2, -canvasHeight / 2);
      context.drawImage(this.toCanvasImageSource(), sx, sy, sWidth, sHeight, dx, dy, newWidth, newHeight);
      context.restore();
    }
    /** @internal */
    _unmapSourceRegion(sx, sy, sWidth, sHeight, rotation, flip) {
      if (flip) {
        const rotatedWidth = rotation % 180 === 0 ? this.squarePixelWidth : this.squarePixelHeight;
        sx = rotatedWidth - sx - sWidth;
      }
      if (rotation === 90) {
        [sx, sy, sWidth, sHeight] = [
          sy,
          this.squarePixelHeight - sx - sWidth,
          sHeight,
          sWidth
        ];
      } else if (rotation === 180) {
        [sx, sy] = [
          this.squarePixelWidth - sx - sWidth,
          this.squarePixelHeight - sy - sHeight
        ];
      } else if (rotation === 270) {
        [sx, sy, sWidth, sHeight] = [
          this.squarePixelWidth - sy - sHeight,
          sx,
          sHeight,
          sWidth
        ];
      }
      return { sx, sy, sWidth, sHeight };
    }
    /**
     * Draws the sample onto the target canvas with fit behavior, manually mipmapping on strong downscales for quality.
     * @internal
     */
    _drawWithFitAndMipmapping(targetCanvas, targetContext, options) {
      const targetWidth = targetCanvas.width;
      const targetHeight = targetCanvas.height;
      const [rotatedWidth, rotatedHeight] = options.rotation % 180 === 0 ? [this.squarePixelWidth, this.squarePixelHeight] : [this.squarePixelHeight, this.squarePixelWidth];
      const sourceWidth = options.crop ? options.crop.width : rotatedWidth;
      const sourceHeight = options.crop ? options.crop.height : rotatedHeight;
      let mipLevels = 0;
      if (2 * targetWidth < sourceWidth && 2 * targetHeight < sourceHeight) {
        mipLevels = Math.floor(Math.log2(Math.min(sourceWidth / targetWidth, sourceHeight / targetHeight)));
      }
      const drawWidth = targetWidth * 2 ** mipLevels;
      const drawHeight = targetHeight * 2 ** mipLevels;
      const { canvas, context, isNew } = mipLevels > 0 ? getTransformationCanvas(drawWidth, drawHeight) : { canvas: targetCanvas, context: targetContext, isNew: options.targetIsFresh };
      context.imageSmoothingQuality = "high";
      if (options.fillBlack) {
        context.fillStyle = "black";
        context.fillRect(0, 0, drawWidth, drawHeight);
      } else if (!isNew) {
        context.clearRect(0, 0, drawWidth, drawHeight);
      }
      this.drawWithFit(context, {
        fit: options.fit,
        rotation: options.rotation,
        flip: options.flip,
        crop: options.crop
      });
      context.globalCompositeOperation = "copy";
      for (let i3 = mipLevels; i3 > 1; i3--) {
        const levelWidth = targetWidth * 2 ** i3;
        const levelHeight = targetHeight * 2 ** i3;
        context.drawImage(canvas, 0, 0, levelWidth, levelHeight, 0, 0, levelWidth / 2, levelHeight / 2);
      }
      context.globalCompositeOperation = "source-over";
      if (mipLevels > 0) {
        targetContext.imageSmoothingQuality = "high";
        targetContext.globalCompositeOperation = "copy";
        targetContext.drawImage(canvas, 0, 0, 2 * targetWidth, 2 * targetHeight, 0, 0, targetWidth, targetHeight);
        targetContext.globalCompositeOperation = "source-over";
      }
    }
    /**
     * Converts this video sample to a
     * [`CanvasImageSource`](https://udn.realityripple.com/docs/Web/API/CanvasImageSource) for drawing to a canvas.
     *
     * You must use the value returned by this method immediately, as any VideoFrame created internally may
     * automatically be closed in the next microtask.
     */
    toCanvasImageSource() {
      if (this._closed) {
        throw new Error("VideoSample is closed.");
      }
      assert(this._data !== null);
      if (this._data instanceof VideoSampleResource || this._data instanceof Uint8Array) {
        const videoFrame = this.toVideoFrame();
        queueMicrotask(() => videoFrame.close());
        return videoFrame;
      } else {
        return this._data;
      }
    }
    /**
     * Transform this video sample to a new video sample given the options. Can be used to resize, rotate, flip, and
     * crop the sample.
     *
     * In non-browser environments, this method will not work by default. To make it work, register a custom
     * transformer function via {@link registerVideoSampleTransformer}.
     */
    async transform(options) {
      if (!options || typeof options !== "object") {
        throw new TypeError("options must be an object.");
      }
      if (options.width !== void 0 && (!Number.isInteger(options.width) || options.width <= 0)) {
        throw new TypeError("options.width, when provided, must be a positive integer.");
      }
      if (options.height !== void 0 && (!Number.isInteger(options.height) || options.height <= 0)) {
        throw new TypeError("options.height, when provided, must be a positive integer.");
      }
      if (options.roundDimensionsTo !== void 0 && (!Number.isInteger(options.roundDimensionsTo) || options.roundDimensionsTo <= 0)) {
        throw new TypeError("options.roundDimensionsTo, when provided, must be a positive integer.");
      }
      if (options.fit !== void 0 && !["fill", "contain", "cover"].includes(options.fit)) {
        throw new TypeError('options.fit, when provided, must be one of "fill", "contain", or "cover".');
      }
      if (options.width !== void 0 && options.height !== void 0 && options.fit === void 0) {
        throw new TypeError("When both options.width and options.height are provided, options.fit must also be provided.");
      }
      if (options.rotate !== void 0 && ![0, 90, 180, 270].includes(options.rotate)) {
        throw new TypeError("options.rotate, when provided, must be 0, 90, 180 or 270.");
      }
      if (options.flip !== void 0 && typeof options.flip !== "boolean") {
        throw new TypeError("options.flip, when provided, must be a boolean.");
      }
      if (options.crop !== void 0) {
        validateCropRectangle(options.crop, "options.");
      }
      if (options.alpha !== void 0 && !["keep", "discard"].includes(options.alpha)) {
        throw new TypeError("options.alpha, when provided, must be 'keep' or 'discard'.");
      }
      const { rotation, flip } = composeRotationAndFlip(this.rotation, this.flip, options.rotate ?? 0, options.flip ?? false);
      const [rotatedWidth, rotatedHeight] = rotation % 180 === 0 ? [this.squarePixelWidth, this.squarePixelHeight] : [this.squarePixelHeight, this.squarePixelWidth];
      let finalCrop = options.crop;
      if (finalCrop) {
        finalCrop = clampCropRectangle(finalCrop, rotatedWidth, rotatedHeight);
      }
      const cropWidth = finalCrop ? finalCrop.width : rotatedWidth;
      const cropHeight = finalCrop ? finalCrop.height : rotatedHeight;
      const originalAspectRatio = cropWidth / cropHeight;
      let targetWidth;
      let targetHeight;
      if (options.width !== void 0 && options.height === void 0) {
        targetWidth = options.width;
        targetHeight = targetWidth / originalAspectRatio;
      } else if (options.width === void 0 && options.height !== void 0) {
        targetHeight = options.height;
        targetWidth = targetHeight * originalAspectRatio;
      } else if (options.width !== void 0 && options.height !== void 0) {
        targetWidth = options.width;
        targetHeight = options.height;
      } else {
        targetWidth = cropWidth;
        targetHeight = cropHeight;
      }
      targetWidth = roundToMultiple(targetWidth, options.roundDimensionsTo ?? 1);
      targetHeight = roundToMultiple(targetHeight, options.roundDimensionsTo ?? 1);
      const description = {
        width: targetWidth,
        height: targetHeight,
        fit: options.fit ?? "fill",
        rotation,
        flip,
        crop: finalCrop ?? {
          left: 0,
          top: 0,
          width: rotatedWidth,
          height: rotatedHeight
        },
        alpha: options.alpha ?? "keep"
      };
      for (const transformer of registeredVideoSampleTransformers) {
        let result = transformer(this, description);
        if (isThenable(result))
          result = await result;
        if (result !== null) {
          return result;
        }
      }
      const { canvas, context, isNew } = getTransformationCanvas(description.width, description.height);
      this._drawWithFitAndMipmapping(canvas, context, {
        fit: description.fit,
        rotation: description.rotation,
        flip: description.flip,
        crop: description.crop,
        targetIsFresh: isNew,
        fillBlack: description.alpha === "discard"
      });
      return new _VideoSample(canvas, {
        timestamp: this.timestamp,
        duration: this.duration,
        // Any previous rotation and flip are now baked in
        rotation: 0,
        flip: false
      });
    }
    /** Sets the rotation metadata of this video sample. */
    setRotation(newRotation) {
      if (![0, 90, 180, 270].includes(newRotation)) {
        throw new TypeError("newRotation must be 0, 90, 180, or 270.");
      }
      this.rotation = newRotation;
    }
    /** Sets the flip metadata of this video sample. */
    setFlip(newFlip) {
      if (typeof newFlip !== "boolean") {
        throw new TypeError("newFlip must be a boolean.");
      }
      this.flip = newFlip;
    }
    /** Sets the presentation timestamp of this video sample, in seconds. */
    setTimestamp(newTimestamp) {
      if (!Number.isFinite(newTimestamp)) {
        throw new TypeError("newTimestamp must be a number.");
      }
      this.timestamp = newTimestamp;
    }
    /** Sets the duration of this video sample, in seconds. */
    setDuration(newDuration) {
      if (!Number.isFinite(newDuration) || newDuration < 0) {
        throw new TypeError("newDuration must be a non-negative number.");
      }
      this.duration = newDuration;
    }
    /** Sets the encode options used when this sample is passed to an encoder. */
    setEncodeOptions(newEncodeOptions) {
      if (!newEncodeOptions || typeof newEncodeOptions !== "object") {
        throw new TypeError("newEncodeOptions must be an object.");
      }
      this.encodeOptions = newEncodeOptions;
    }
    /** Calls `.close()`. */
    [Symbol.dispose]() {
      this.close();
    }
  };
  var registeredVideoSampleTransformers = [];
  var TRANSFORMATION_CANVAS_CACHE_MAX_SIZE = 3;
  var transformationCanvasCache = [];
  var transformationCanvasCacheNextAge = 0;
  var getTransformationCanvas = (width, height) => {
    for (const entry of transformationCanvasCache) {
      if (entry.canvas.width === width && entry.canvas.height === height) {
        entry.age = transformationCanvasCacheNextAge++;
        return { canvas: entry.canvas, context: entry.context, isNew: false };
      }
    }
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(width, height);
    } else {
      if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("Cannot transform VideoSamples in this environment. Either run in an environment with OffscreenCanvas or HTMLCanvasElement, or supply a custom VideoSample transformer using registerVideoSampleTransformer().");
      }
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d", {
      alpha: true,
      willReadFrequently: false
    });
    if (!context) {
      throw new Error("The '2d' canvas context is required to transform VideoSamples. Register a custom transformer using registerVideoSampleTransformer to work around this limitation.");
    }
    if (transformationCanvasCache.length >= TRANSFORMATION_CANVAS_CACHE_MAX_SIZE) {
      transformationCanvasCache.splice(arrayArgmin(transformationCanvasCache, (x2) => x2.age), 1);
    }
    transformationCanvasCache.push({
      canvas,
      context,
      age: transformationCanvasCacheNextAge++
    });
    return { canvas, context, isNew: true };
  };
  var VideoSampleColorSpace = class {
    /** Creates a new VideoSampleColorSpace. */
    constructor(init) {
      if (init !== void 0) {
        if (!init || typeof init !== "object") {
          throw new TypeError("init.colorSpace, when provided, must be an object.");
        }
        const primariesValues = Object.keys(COLOR_PRIMARIES_MAP);
        if (init.primaries != null && !primariesValues.includes(init.primaries)) {
          throw new TypeError(`init.colorSpace.primaries, when provided, must be one of ${primariesValues.join(", ")}.`);
        }
        const transferValues = Object.keys(TRANSFER_CHARACTERISTICS_MAP);
        if (init.transfer != null && !transferValues.includes(init.transfer)) {
          throw new TypeError(`init.colorSpace.transfer, when provided, must be one of ${transferValues.join(", ")}.`);
        }
        const matrixValues = Object.keys(MATRIX_COEFFICIENTS_MAP);
        if (init.matrix != null && !matrixValues.includes(init.matrix)) {
          throw new TypeError(`init.colorSpace.matrix, when provided, must be one of ${matrixValues.join(", ")}.`);
        }
        if (init.fullRange != null && typeof init.fullRange !== "boolean") {
          throw new TypeError("init.colorSpace.fullRange, when provided, must be a boolean.");
        }
      }
      this.primaries = init?.primaries ?? null;
      this.transfer = init?.transfer ?? null;
      this.matrix = init?.matrix ?? null;
      this.fullRange = init?.fullRange ?? null;
    }
    /** Serializes the color space to a JSON object. */
    toJSON() {
      return {
        primaries: this.primaries,
        transfer: this.transfer,
        matrix: this.matrix,
        fullRange: this.fullRange
      };
    }
  };
  var isVideoFrame = (x2) => {
    return typeof VideoFrame !== "undefined" && x2 instanceof VideoFrame;
  };
  var clampCropRectangle = (crop, outerWidth, outerHeight) => {
    const left = Math.min(crop.left, outerWidth);
    const top = Math.min(crop.top, outerHeight);
    const width = Math.min(crop.width, outerWidth - left);
    const height = Math.min(crop.height, outerHeight - top);
    assert(width >= 0);
    assert(height >= 0);
    return { left, top, width, height };
  };
  var validateCropRectangle = (crop, prefix) => {
    if (!crop || typeof crop !== "object") {
      throw new TypeError(prefix + "crop, when provided, must be an object.");
    }
    if (!Number.isInteger(crop.left) || crop.left < 0) {
      throw new TypeError(prefix + "crop.left must be a non-negative integer.");
    }
    if (!Number.isInteger(crop.top) || crop.top < 0) {
      throw new TypeError(prefix + "crop.top must be a non-negative integer.");
    }
    if (!Number.isInteger(crop.width) || crop.width < 0) {
      throw new TypeError(prefix + "crop.width must be a non-negative integer.");
    }
    if (!Number.isInteger(crop.height) || crop.height < 0) {
      throw new TypeError(prefix + "crop.height must be a non-negative integer.");
    }
  };
  var validateVideoFrameCopyToOptions = (options) => {
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.colorSpace !== void 0 && !["display-p3", "srgb"].includes(options.colorSpace)) {
      throw new TypeError("options.colorSpace, when provided, must be 'display-p3' or 'srgb'.");
    }
    if (options.format !== void 0 && typeof options.format !== "string") {
      throw new TypeError("options.format, when provided, must be a string.");
    }
    if (options.layout !== void 0) {
      if (!Array.isArray(options.layout)) {
        throw new TypeError("options.layout, when provided, must be an array.");
      }
      for (const plane of options.layout) {
        if (!plane || typeof plane !== "object") {
          throw new TypeError("Each entry in options.layout must be an object.");
        }
        if (!Number.isInteger(plane.offset) || plane.offset < 0) {
          throw new TypeError("plane.offset must be a non-negative integer.");
        }
        if (!Number.isInteger(plane.stride) || plane.stride < 0) {
          throw new TypeError("plane.stride must be a non-negative integer.");
        }
      }
    }
    if (options.rect !== void 0) {
      if (!options.rect || typeof options.rect !== "object") {
        throw new TypeError("options.rect, when provided, must be an object.");
      }
      if (options.rect.x !== void 0 && (!Number.isInteger(options.rect.x) || options.rect.x < 0)) {
        throw new TypeError("options.rect.x, when provided, must be a non-negative integer.");
      }
      if (options.rect.y !== void 0 && (!Number.isInteger(options.rect.y) || options.rect.y < 0)) {
        throw new TypeError("options.rect.y, when provided, must be a non-negative integer.");
      }
      if (options.rect.width !== void 0 && (!Number.isInteger(options.rect.width) || options.rect.width < 0)) {
        throw new TypeError("options.rect.width, when provided, must be a non-negative integer.");
      }
      if (options.rect.height !== void 0 && (!Number.isInteger(options.rect.height) || options.rect.height < 0)) {
        throw new TypeError("options.rect.height, when provided, must be a non-negative integer.");
      }
    }
  };
  var createDefaultPlaneLayout = (format, codedWidth, codedHeight) => {
    const planes = getPlaneConfigs(format);
    const layouts = [];
    let currentOffset = 0;
    for (const plane of planes) {
      const planeWidth = Math.ceil(codedWidth / plane.widthDivisor);
      const planeHeight = Math.ceil(codedHeight / plane.heightDivisor);
      const stride = planeWidth * plane.sampleBytes;
      const planeSize = stride * planeHeight;
      layouts.push({
        offset: currentOffset,
        stride
      });
      currentOffset += planeSize;
    }
    return layouts;
  };
  var getPlaneConfigs = (format) => {
    const yuv = (yBytes, uvBytes, subX, subY, hasAlpha) => {
      const configs = [
        { sampleBytes: yBytes, widthDivisor: 1, heightDivisor: 1 },
        { sampleBytes: uvBytes, widthDivisor: subX, heightDivisor: subY },
        { sampleBytes: uvBytes, widthDivisor: subX, heightDivisor: subY }
      ];
      if (hasAlpha) {
        configs.push({ sampleBytes: yBytes, widthDivisor: 1, heightDivisor: 1 });
      }
      return configs;
    };
    switch (format) {
      case "I420":
        return yuv(1, 1, 2, 2, false);
      case "I420P10":
      case "I420P12":
        return yuv(2, 2, 2, 2, false);
      case "I420A":
        return yuv(1, 1, 2, 2, true);
      case "I420AP10":
      case "I420AP12":
        return yuv(2, 2, 2, 2, true);
      case "I422":
        return yuv(1, 1, 2, 1, false);
      case "I422P10":
      case "I422P12":
        return yuv(2, 2, 2, 1, false);
      case "I422A":
        return yuv(1, 1, 2, 1, true);
      case "I422AP10":
      case "I422AP12":
        return yuv(2, 2, 2, 1, true);
      case "I444":
        return yuv(1, 1, 1, 1, false);
      case "I444P10":
      case "I444P12":
        return yuv(2, 2, 1, 1, false);
      case "I444A":
        return yuv(1, 1, 1, 1, true);
      case "I444AP10":
      case "I444AP12":
        return yuv(2, 2, 1, 1, true);
      case "NV12":
        return [
          { sampleBytes: 1, widthDivisor: 1, heightDivisor: 1 },
          { sampleBytes: 2, widthDivisor: 2, heightDivisor: 2 }
          // Interleaved U and V
        ];
      case "RGBA":
      case "RGBX":
      case "BGRA":
      case "BGRX":
        return [
          { sampleBytes: 4, widthDivisor: 1, heightDivisor: 1 }
        ];
      default:
        assertNever(format);
        assert(false);
    }
  };
  var ParseVideoFrameCopyToOptions = (sample, options) => {
    const defaultRect = {
      left: 0,
      top: 0,
      width: sample.codedWidth,
      height: sample.codedHeight
    };
    const overrideRect = options.rect;
    const parsedRect = ParseVisibleRect(defaultRect, overrideRect, sample.codedWidth, sample.codedHeight, sample.format);
    const optLayout = options.layout;
    let format;
    if (!options.format || options.format === sample.format) {
      format = sample.format;
    } else if (["RGBA", "RGBX", "BGRA", "BGRX"].includes(options.format)) {
      format = options.format;
    } else {
      throw new Error("NotSupportedError: Invalid destination format.");
    }
    return ComputeLayoutAndAllocationSize(parsedRect, format, optLayout);
  };
  var ParseVisibleRect = (defaultRect, overrideRect, codedWidth, codedHeight, format) => {
    const sourceRect = { ...defaultRect };
    if (overrideRect !== void 0) {
      if (overrideRect.width === 0 || overrideRect.height === 0) {
        throw new TypeError("visibleRect dimensions cannot be zero.");
      }
      if ((overrideRect.x || 0) + (overrideRect.width || 0) > codedWidth) {
        throw new TypeError("visibleRect exceeds codedWidth.");
      }
      if ((overrideRect.y || 0) + (overrideRect.height || 0) > codedHeight) {
        throw new TypeError("visibleRect exceeds codedHeight.");
      }
      sourceRect.x = overrideRect.x || 0;
      sourceRect.y = overrideRect.y || 0;
      sourceRect.width = overrideRect.width || 0;
      sourceRect.height = overrideRect.height || 0;
    }
    const validAlignment = VerifyRectOffsetAlignment(format, sourceRect);
    if (!validAlignment) {
      throw new TypeError("visibleRect alignment is invalid for the format.");
    }
    return sourceRect;
  };
  var VerifyRectOffsetAlignment = (format, rect) => {
    if (format === null)
      return true;
    const planes = getPlaneConfigs(format);
    for (let planeIndex = 0; planeIndex < planes.length; planeIndex++) {
      const plane = planes[planeIndex];
      const sampleWidth = plane.widthDivisor;
      const sampleHeight = plane.heightDivisor;
      if ((rect.x || 0) % sampleWidth !== 0)
        return false;
      if ((rect.y || 0) % sampleHeight !== 0)
        return false;
    }
    return true;
  };
  var ComputeLayoutAndAllocationSize = (parsedRect, format, layout) => {
    const planes = getPlaneConfigs(format);
    const numPlanes = planes.length;
    if (layout !== void 0 && layout.length !== numPlanes) {
      throw new TypeError(`Layout must have ${numPlanes} planes.`);
    }
    let minAllocationSize = 0;
    const computedLayouts = [];
    const endOffsets = [];
    for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
      const plane = planes[planeIndex];
      const sampleBytes = plane.sampleBytes;
      const sampleWidth = plane.widthDivisor;
      const sampleHeight = plane.heightDivisor;
      const computedLayout = {
        destinationOffset: 0,
        destinationStride: 0,
        sourceTop: 0,
        sourceHeight: 0,
        sourceLeftBytes: 0,
        sourceWidthBytes: 0
      };
      computedLayout.sourceTop = Math.ceil(Math.trunc(parsedRect.y || 0) / sampleHeight);
      computedLayout.sourceHeight = Math.ceil(Math.trunc(parsedRect.height || 0) / sampleHeight);
      computedLayout.sourceLeftBytes = Math.floor(Math.trunc(parsedRect.x || 0) / sampleWidth) * sampleBytes;
      computedLayout.sourceWidthBytes = Math.floor(Math.trunc(parsedRect.width || 0) / sampleWidth) * sampleBytes;
      if (layout !== void 0) {
        const planeLayout = layout[planeIndex];
        if (planeLayout.stride < computedLayout.sourceWidthBytes) {
          throw new TypeError(`Stride for plane ${planeIndex} is too small.`);
        }
        computedLayout.destinationOffset = planeLayout.offset;
        computedLayout.destinationStride = planeLayout.stride;
      } else {
        computedLayout.destinationOffset = minAllocationSize;
        computedLayout.destinationStride = computedLayout.sourceWidthBytes;
      }
      const planeSize = computedLayout.destinationStride * computedLayout.sourceHeight;
      const planeEnd = planeSize + computedLayout.destinationOffset;
      if (planeEnd > 4294967295) {
        throw new TypeError("Allocation size exceeds limit.");
      }
      endOffsets.push(planeEnd);
      minAllocationSize = Math.max(minAllocationSize, planeEnd);
      for (let earlierPlaneIndex = 0; earlierPlaneIndex < planeIndex; earlierPlaneIndex++) {
        const earlierLayout = computedLayouts[earlierPlaneIndex];
        if (endOffsets[planeIndex] <= earlierLayout.destinationOffset || endOffsets[earlierPlaneIndex] <= computedLayout.destinationOffset) {
          continue;
        }
        throw new TypeError("Planes overlap.");
      }
      computedLayouts.push(computedLayout);
    }
    return {
      allocationSize: minAllocationSize,
      computedLayouts
    };
  };

  // node_modules/mediabunny/dist/modules/src/custom-coder.js
  var customVideoDecoders = [];
  var customAudioDecoders = [];

  // node_modules/mediabunny/dist/modules/src/media-sink.js
  var validatePacketRetrievalOptions = (options) => {
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (options.metadataOnly !== void 0 && typeof options.metadataOnly !== "boolean") {
      throw new TypeError("options.metadataOnly, when defined, must be a boolean.");
    }
    if (options.verifyKeyPackets !== void 0 && typeof options.verifyKeyPackets !== "boolean") {
      throw new TypeError("options.verifyKeyPackets, when defined, must be a boolean.");
    }
    if (options.verifyKeyPackets && options.metadataOnly) {
      throw new TypeError("options.verifyKeyPackets and options.metadataOnly cannot be enabled together.");
    }
    if (options.skipLiveWait !== void 0 && typeof options.skipLiveWait !== "boolean") {
      throw new TypeError("options.skipLiveWait, when defined, must be a boolean.");
    }
  };
  var validateTimestamp = (timestamp) => {
    if (!isNumber(timestamp)) {
      throw new TypeError("timestamp must be a number.");
    }
  };
  var maybeFixPacketType = (track, promise, options) => {
    if (options.verifyKeyPackets) {
      return promise.then(async (packet) => {
        if (!packet || packet.type === "delta") {
          return packet;
        }
        const determinedType = await track.determinePacketType(packet);
        if (determinedType) {
          packet.type = determinedType;
        }
        return packet;
      });
    } else {
      return promise;
    }
  };
  var EncodedPacketSink = class {
    /** Creates a new {@link EncodedPacketSink} for the given {@link InputTrack}. */
    constructor(track) {
      if (!(track instanceof InputTrack)) {
        throw new TypeError("track must be an InputTrack.");
      }
      this._track = track;
    }
    /**
     * Retrieves the track's first packet (in decode order), or null if it has no packets. The first packet is very
     * likely to be a key packet, but it doesn't have to be.
     */
    async getFirstPacket(options = {}) {
      validatePacketRetrievalOptions(options);
      if (this._track.input._disposed) {
        throw new InputDisposedError();
      }
      return maybeFixPacketType(this._track, this._track._backing.getFirstPacket(options), options);
    }
    /** Retrieves the track's first key packet (in decode order), or null if it has no key packets. */
    async getFirstKeyPacket(options = {}) {
      validatePacketRetrievalOptions(options);
      const firstPacket = await this.getFirstPacket(options);
      if (!firstPacket) {
        return null;
      }
      if (firstPacket.type === "key") {
        return firstPacket;
      }
      return this.getNextKeyPacket(firstPacket, options);
    }
    /**
     * Retrieves the packet corresponding to the given timestamp, in seconds. More specifically, returns the last packet
     * (in presentation order) with a start timestamp less than or equal to the given timestamp. This method can be
     * used to retrieve a track's last packet using `getPacket(Infinity)`. The method returns null if the timestamp
     * is before the first packet in the track.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    async getPacket(timestamp, options = {}) {
      validateTimestamp(timestamp);
      validatePacketRetrievalOptions(options);
      if (this._track.input._disposed) {
        throw new InputDisposedError();
      }
      return maybeFixPacketType(this._track, this._track._backing.getPacket(timestamp, options), options);
    }
    /**
     * Retrieves the packet following the given packet (in decode order), or null if the given packet is the
     * last packet.
     */
    async getNextPacket(packet, options = {}) {
      if (!(packet instanceof EncodedPacket)) {
        throw new TypeError("packet must be an EncodedPacket.");
      }
      validatePacketRetrievalOptions(options);
      if (this._track.input._disposed) {
        throw new InputDisposedError();
      }
      return maybeFixPacketType(this._track, this._track._backing.getNextPacket(packet, options), options);
    }
    /**
     * Retrieves the key packet corresponding to the given timestamp, in seconds. More specifically, returns the last
     * key packet (in presentation order) with a start timestamp less than or equal to the given timestamp. A key packet
     * is a packet that doesn't require previous packets to be decoded. This method can be used to retrieve a track's
     * last key packet using `getKeyPacket(Infinity)`. The method returns null if the timestamp is before the first
     * key packet in the track.
     *
     * To ensure that the returned packet is guaranteed to be a real key frame, enable `options.verifyKeyPackets`.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    async getKeyPacket(timestamp, options = {}) {
      validateTimestamp(timestamp);
      validatePacketRetrievalOptions(options);
      if (this._track.input._disposed) {
        throw new InputDisposedError();
      }
      if (!options.verifyKeyPackets) {
        return this._track._backing.getKeyPacket(timestamp, options);
      }
      const packet = await this._track._backing.getKeyPacket(timestamp, options);
      if (!packet) {
        return packet;
      }
      assert(packet.type === "key");
      const determinedType = await this._track.determinePacketType(packet);
      if (determinedType === "delta") {
        return this.getKeyPacket(packet.timestamp - 1 / await this._track.getTimeResolution(), options);
      }
      return packet;
    }
    /**
     * Retrieves the key packet following the given packet (in decode order), or null if the given packet is the last
     * key packet.
     *
     * To ensure that the returned packet is guaranteed to be a real key frame, enable `options.verifyKeyPackets`.
     */
    async getNextKeyPacket(packet, options = {}) {
      if (!(packet instanceof EncodedPacket)) {
        throw new TypeError("packet must be an EncodedPacket.");
      }
      validatePacketRetrievalOptions(options);
      if (this._track.input._disposed) {
        throw new InputDisposedError();
      }
      if (!options.verifyKeyPackets) {
        return this._track._backing.getNextKeyPacket(packet, options);
      }
      const nextPacket = await this._track._backing.getNextKeyPacket(packet, options);
      if (!nextPacket) {
        return nextPacket;
      }
      assert(nextPacket.type === "key");
      const determinedType = await this._track.determinePacketType(nextPacket);
      if (determinedType === "delta") {
        return this.getNextKeyPacket(nextPacket, options);
      }
      return nextPacket;
    }
    /**
     * Creates an async iterator that yields the packets in this track in decode order. To enable fast iteration, this
     * method will intelligently preload packets based on the speed of the consumer.
     *
     * @param startPacket - (optional) The packet from which iteration should begin. This packet will also be yielded.
     * @param endPacket - (optional) The packet at which iteration should end. This packet will _not_ be yielded.
     */
    packets(startPacket, endPacket, options = {}) {
      if (startPacket !== void 0 && !(startPacket instanceof EncodedPacket)) {
        throw new TypeError("startPacket must be an EncodedPacket.");
      }
      if (startPacket !== void 0 && startPacket.isMetadataOnly && !options?.metadataOnly) {
        throw new TypeError("startPacket can only be metadata-only if options.metadataOnly is enabled.");
      }
      if (endPacket !== void 0 && !(endPacket instanceof EncodedPacket)) {
        throw new TypeError("endPacket must be an EncodedPacket.");
      }
      validatePacketRetrievalOptions(options);
      if (this._track.input._disposed) {
        throw new InputDisposedError();
      }
      const packetQueue = [];
      let { promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers();
      let { promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers();
      let ended = false;
      let terminated = false;
      let outOfBandError = null;
      let hasOutOfBandError = false;
      const timestamps = [];
      const maxQueueSize = () => Math.max(2, timestamps.length);
      (async () => {
        let packet = startPacket ?? await this.getFirstPacket(options);
        while (packet && !terminated && !this._track.input._disposed) {
          if (endPacket && packet.sequenceNumber >= endPacket?.sequenceNumber) {
            break;
          }
          if (packetQueue.length > maxQueueSize()) {
            ({ promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers());
            await queueDequeue;
            continue;
          }
          packetQueue.push(packet);
          onQueueNotEmpty();
          ({ promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers());
          packet = await this.getNextPacket(packet, options);
        }
        ended = true;
        onQueueNotEmpty();
      })().catch((error) => {
        if (!hasOutOfBandError) {
          outOfBandError = error;
          hasOutOfBandError = true;
          onQueueNotEmpty();
        }
      });
      const track = this._track;
      return {
        async next() {
          while (true) {
            if (track.input._disposed) {
              throw new InputDisposedError();
            } else if (terminated) {
              return { value: void 0, done: true };
            } else if (hasOutOfBandError) {
              throw outOfBandError;
            } else if (packetQueue.length > 0) {
              const value = packetQueue.shift();
              const now = performance.now();
              timestamps.push(now);
              while (timestamps.length > 0 && now - timestamps[0] >= 1e3) {
                timestamps.shift();
              }
              onQueueDequeue();
              return { value, done: false };
            } else if (ended) {
              return { value: void 0, done: true };
            } else {
              await queueNotEmpty;
            }
          }
        },
        async return() {
          terminated = true;
          onQueueDequeue();
          onQueueNotEmpty();
          return { value: void 0, done: true };
        },
        async throw(error) {
          throw error;
        },
        [Symbol.asyncIterator]() {
          return this;
        }
      };
    }
  };
  var MAX_QUEUE_SIZE = 4;
  var DecoderWrapper = class {
    constructor(onSample, onError) {
      this.onSample = onSample;
      this.onError = onError;
      this.onDequeue = null;
    }
  };
  var BaseMediaSampleSink = class {
    /** @internal */
    mediaSamplesInRange(startTimestamp = -Infinity, endTimestamp = Infinity, options) {
      validateTimestamp(startTimestamp);
      validateTimestamp(endTimestamp);
      const sampleQueue = [];
      let firstSampleQueued = false;
      let lastSample = null;
      let { promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers();
      let { promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers();
      let decoderIsFlushed = false;
      let ended = false;
      let terminated = false;
      let decoder = null;
      let outOfBandError = null;
      let hasOutOfBandError = false;
      const packetRetrievalOptions = {
        ...options,
        verifyKeyPackets: true,
        metadataOnly: false
      };
      (async () => {
        decoder = await this._createDecoder((sample) => {
          onQueueDequeue();
          if (sample.timestamp >= endTimestamp) {
            ended = true;
          }
          if (ended) {
            sample.close();
            return;
          }
          if (lastSample) {
            if (sample.timestamp > startTimestamp) {
              sampleQueue.push(lastSample);
              firstSampleQueued = true;
            } else {
              lastSample.close();
            }
          }
          if (sample.timestamp >= startTimestamp) {
            sampleQueue.push(sample);
            firstSampleQueued = true;
          }
          lastSample = firstSampleQueued ? null : sample;
          if (sampleQueue.length > 0) {
            onQueueNotEmpty();
            ({ promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers());
          }
        }, (error) => {
          if (!hasOutOfBandError) {
            outOfBandError = error;
            hasOutOfBandError = true;
            onQueueNotEmpty();
          }
        });
        decoder.onDequeue = () => onQueueDequeue();
        const packetSink = this._createPacketSink();
        const keyPacket = await packetSink.getKeyPacket(startTimestamp, packetRetrievalOptions) ?? await packetSink.getFirstKeyPacket(packetRetrievalOptions);
        let currentPacket = keyPacket;
        const endPacket = void 0;
        const packets = packetSink.packets(keyPacket ?? void 0, endPacket, packetRetrievalOptions);
        await packets.next();
        while (currentPacket && !ended && !this._track.input._disposed) {
          if (sampleQueue.length + decoder.getDecodeQueueSize() >= MAX_QUEUE_SIZE) {
            ({ promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers());
            await queueDequeue;
            continue;
          }
          decoder.decode(currentPacket);
          const packetResult = await packets.next();
          if (packetResult.done) {
            break;
          }
          currentPacket = packetResult.value;
        }
        await packets.return();
        if (!terminated && !this._track.input._disposed) {
          await decoder.flush();
        }
        if (!firstSampleQueued && lastSample) {
          sampleQueue.push(lastSample);
          lastSample = null;
        }
        decoderIsFlushed = true;
        onQueueNotEmpty();
      })().catch((error) => {
        if (!hasOutOfBandError) {
          outOfBandError = error;
          hasOutOfBandError = true;
          onQueueNotEmpty();
        }
      }).finally(() => {
        decoder?.close();
      });
      const track = this._track;
      const closeSamples = () => {
        lastSample?.close();
        for (const sample of sampleQueue) {
          sample.close();
        }
      };
      return {
        async next() {
          while (true) {
            if (track.input._disposed) {
              terminated = true;
              ended = true;
              closeSamples();
              throw new InputDisposedError();
            } else if (terminated) {
              return { value: void 0, done: true };
            } else if (hasOutOfBandError) {
              terminated = true;
              ended = true;
              closeSamples();
              throw outOfBandError;
            } else if (sampleQueue.length > 0) {
              const value = sampleQueue.shift();
              onQueueDequeue();
              return { value, done: false };
            } else if (!decoderIsFlushed) {
              await queueNotEmpty;
            } else {
              return { value: void 0, done: true };
            }
          }
        },
        async return() {
          terminated = true;
          ended = true;
          onQueueDequeue();
          onQueueNotEmpty();
          closeSamples();
          return { value: void 0, done: true };
        },
        async throw(error) {
          throw error;
        },
        [Symbol.asyncIterator]() {
          return this;
        }
      };
    }
    /** @internal */
    mediaSamplesAtTimestamps(timestamps, options) {
      validateAnyIterable(timestamps);
      const timestampIterator = toAsyncIterator(timestamps);
      const timestampsOfInterest = [];
      const sampleQueue = [];
      let { promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers();
      let { promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers();
      let decoderIsFlushed = false;
      let terminated = false;
      let decoder = null;
      let outOfBandError = null;
      let hasOutOfBandError = false;
      const pushToQueue = (sample) => {
        sampleQueue.push(sample);
        onQueueNotEmpty();
        ({ promise: queueNotEmpty, resolve: onQueueNotEmpty } = promiseWithResolvers());
      };
      const retrievalOptions = {
        ...options,
        verifyKeyPackets: true,
        metadataOnly: false
      };
      (async () => {
        decoder = await this._createDecoder((sample) => {
          onQueueDequeue();
          if (terminated) {
            sample.close();
            return;
          }
          let sampleUses = 0;
          while (timestampsOfInterest.length > 0 && sample.timestamp - timestampsOfInterest[0] > -1e-10) {
            sampleUses++;
            timestampsOfInterest.shift();
          }
          if (sampleUses > 0) {
            for (let i3 = 0; i3 < sampleUses; i3++) {
              pushToQueue(i3 < sampleUses - 1 ? sample.clone() : sample);
            }
          } else {
            sample.close();
          }
        }, (error) => {
          if (!hasOutOfBandError) {
            outOfBandError = error;
            hasOutOfBandError = true;
            onQueueNotEmpty();
          }
        });
        decoder.onDequeue = () => onQueueDequeue();
        const packetSink = this._createPacketSink();
        let lastPacket = null;
        let lastKeyPacket = null;
        let maxSequenceNumber = -1;
        const decodePackets = async () => {
          assert(lastKeyPacket);
          assert(decoder);
          let currentPacket = lastKeyPacket;
          decoder.decode(currentPacket);
          while (currentPacket.sequenceNumber < maxSequenceNumber) {
            while (sampleQueue.length + decoder.getDecodeQueueSize() >= MAX_QUEUE_SIZE && !terminated) {
              ({ promise: queueDequeue, resolve: onQueueDequeue } = promiseWithResolvers());
              await queueDequeue;
            }
            if (terminated) {
              break;
            }
            const nextPacket = await packetSink.getNextPacket(currentPacket, retrievalOptions);
            assert(nextPacket);
            decoder.decode(nextPacket);
            currentPacket = nextPacket;
          }
          maxSequenceNumber = -1;
        };
        const flushDecoder = async () => {
          assert(decoder);
          await decoder.flush();
          for (let i3 = 0; i3 < timestampsOfInterest.length; i3++) {
            pushToQueue(null);
          }
          timestampsOfInterest.length = 0;
        };
        for await (const timestamp of timestampIterator) {
          validateTimestamp(timestamp);
          if (terminated || this._track.input._disposed) {
            break;
          }
          const targetPacket = await packetSink.getPacket(timestamp, retrievalOptions);
          const keyPacket = targetPacket && await packetSink.getKeyPacket(timestamp, retrievalOptions);
          if (!keyPacket) {
            if (maxSequenceNumber !== -1) {
              await decodePackets();
              await flushDecoder();
            }
            pushToQueue(null);
            lastPacket = null;
            continue;
          }
          if (lastPacket && (keyPacket.sequenceNumber !== lastKeyPacket.sequenceNumber || targetPacket.timestamp < lastPacket.timestamp)) {
            await decodePackets();
            await flushDecoder();
          }
          timestampsOfInterest.push(targetPacket.timestamp);
          maxSequenceNumber = Math.max(targetPacket.sequenceNumber, maxSequenceNumber);
          lastPacket = targetPacket;
          lastKeyPacket = keyPacket;
        }
        if (!terminated && !this._track.input._disposed) {
          if (maxSequenceNumber !== -1) {
            await decodePackets();
          }
          await flushDecoder();
        }
        decoderIsFlushed = true;
        onQueueNotEmpty();
      })().catch((error) => {
        if (!hasOutOfBandError) {
          outOfBandError = error;
          hasOutOfBandError = true;
          onQueueNotEmpty();
        }
      }).finally(() => {
        decoder?.close();
      });
      const track = this._track;
      const closeSamples = () => {
        for (const sample of sampleQueue) {
          sample?.close();
        }
      };
      return {
        async next() {
          while (true) {
            if (track.input._disposed) {
              terminated = true;
              closeSamples();
              throw new InputDisposedError();
            } else if (terminated) {
              return { value: void 0, done: true };
            } else if (hasOutOfBandError) {
              terminated = true;
              closeSamples();
              throw outOfBandError;
            } else if (sampleQueue.length > 0) {
              const value = sampleQueue.shift();
              assert(value !== void 0);
              onQueueDequeue();
              return { value, done: false };
            } else if (!decoderIsFlushed) {
              await queueNotEmpty;
            } else {
              return { value: void 0, done: true };
            }
          }
        },
        async return() {
          terminated = true;
          onQueueDequeue();
          onQueueNotEmpty();
          closeSamples();
          return { value: void 0, done: true };
        },
        async throw(error) {
          throw error;
        },
        [Symbol.asyncIterator]() {
          return this;
        }
      };
    }
  };
  var VideoDecoderWrapper = class extends DecoderWrapper {
    constructor(onSample, onError, codec, decoderConfig, rotation, flip, timeResolution) {
      super(onSample, onError);
      this.codec = codec;
      this.decoderConfig = decoderConfig;
      this.rotation = rotation;
      this.flip = flip;
      this.timeResolution = timeResolution;
      this.decoder = null;
      this.customDecoder = null;
      this.customDecoderCallSerializer = new CallSerializer();
      this.customDecoderQueueSize = 0;
      this.inputTimestamps = [];
      this.sampleQueue = [];
      this.currentPacketIndex = 0;
      this.raslSkipped = false;
      this.alphaDecoder = null;
      this.alphaHadKeyframe = false;
      this.colorQueue = [];
      this.alphaQueue = [];
      this.merger = null;
      this.decodedAlphaChunkCount = 0;
      this.alphaDecoderQueueSize = 0;
      this.nullAlphaFrameQueue = [];
      this.currentAlphaPacketIndex = 0;
      this.alphaRaslSkipped = false;
      this.finalSamples = [];
      this.mergeAlphaPromises = [];
      const MatchingCustomDecoder = customVideoDecoders.find((x2) => x2.supports(codec, decoderConfig));
      if (MatchingCustomDecoder) {
        this.customDecoder = new MatchingCustomDecoder();
        this.customDecoder.codec = codec;
        this.customDecoder.config = decoderConfig;
        this.customDecoder.onSample = (sample) => {
          if (!(sample instanceof VideoSample)) {
            throw new TypeError("The argument passed to onSample must be a VideoSample.");
          }
          this.finalizeAndEmitSample(sample);
        };
        this.customDecoder.onError = (error) => {
          onError(error);
        };
        void this.customDecoderCallSerializer.call(() => this.customDecoder.init()).catch((error) => onError(error));
      } else {
        const colorHandler = (frame) => {
          if (this.alphaQueue.length > 0) {
            const alphaFrame = this.alphaQueue.shift();
            assert(alphaFrame !== void 0);
            void this.mergeAlpha(frame, alphaFrame);
          } else {
            this.colorQueue.push(frame);
          }
        };
        if (isChromium()) {
          if (codec === "avc" && this.decoderConfig.description) {
            const record = deserializeAvcDecoderConfigurationRecord(toUint8Array(this.decoderConfig.description));
            if (record && record.sequenceParameterSets.length > 0) {
              const sps = parseAvcSps(record.sequenceParameterSets[0]);
              if (sps) {
                if (sps.frameMbsOnlyFlag === 0) {
                  this.decoderConfig = {
                    ...this.decoderConfig,
                    hardwareAcceleration: "prefer-software"
                  };
                }
                if (sps.maxDecFrameBuffering !== 0 && sps.bitstreamRestrictionFlag !== 1) {
                  record.sequenceParameterSets[0] = addAvcBitstreamRestriction(sps);
                  this.decoderConfig = {
                    ...this.decoderConfig,
                    description: serializeAvcDecoderConfigurationRecord(record)
                  };
                }
              }
            }
          }
          if (!colorSpaceIsComplete(this.decoderConfig.colorSpace)) {
            this.decoderConfig = {
              ...this.decoderConfig,
              colorSpace: {
                primaries: this.decoderConfig.colorSpace?.primaries ?? "bt709",
                matrix: this.decoderConfig.colorSpace?.matrix ?? "bt709",
                transfer: this.decoderConfig.colorSpace?.transfer ?? "bt709",
                fullRange: this.decoderConfig.colorSpace?.fullRange ?? false
              }
            };
          }
        }
        const stack = new Error("Decoding error").stack;
        this.decoder = new VideoDecoder({
          output: (frame) => {
            try {
              colorHandler(frame);
            } catch (error) {
              this.onError(error);
            }
          },
          error: (error) => {
            error.stack = stack;
            this.onError(error);
          }
        });
        this.decoder.addEventListener("dequeue", () => {
          this.onDequeue?.();
        });
        this.decoder.configure(this.decoderConfig);
      }
    }
    getDecodeQueueSize() {
      if (this.customDecoder) {
        return this.customDecoderQueueSize;
      } else {
        assert(this.decoder);
        return Math.max(this.decoder.decodeQueueSize, this.alphaDecoder?.decodeQueueSize ?? 0);
      }
    }
    decode(packet) {
      if (this.codec === "hevc" && this.currentPacketIndex > 0 && !this.raslSkipped) {
        if (this.hasHevcRaslPicture(packet.data)) {
          return;
        }
        this.raslSkipped = true;
      }
      if (this.customDecoder) {
        this.customDecoderQueueSize++;
        void this.customDecoderCallSerializer.call(() => this.customDecoder.decode(packet)).catch((error) => this.onError(error)).finally(() => {
          this.customDecoderQueueSize--;
          this.onDequeue?.();
        });
      } else {
        assert(this.decoder);
        if (!isWebKit()) {
          insertSorted(this.inputTimestamps, packet.timestamp, (x2) => x2);
        }
        if (isChromium() && this.currentPacketIndex === 0) {
          if (this.codec === "avc") {
            const filteredNalUnits = [];
            let hasFrameData = false;
            for (const loc of iterateAvcNalUnits(packet.data, this.decoderConfig)) {
              const type = extractNalUnitTypeForAvc(packet.data[loc.offset]);
              hasFrameData ||= type >= 1 && type <= 5;
              if (type === AvcNalUnitType.AUD) {
                if (hasFrameData) {
                  break;
                } else {
                  filteredNalUnits.length = 0;
                }
              }
              if (!(type >= 20 && type <= 31)) {
                filteredNalUnits.push(packet.data.subarray(loc.offset, loc.offset + loc.length));
              }
            }
            if (!this.decoderConfig.description) {
              for (let i3 = 0; i3 < filteredNalUnits.length; i3++) {
                const nalUnit = filteredNalUnits[i3];
                if (extractNalUnitTypeForAvc(nalUnit[0]) !== AvcNalUnitType.SPS) {
                  continue;
                }
                const sps = parseAvcSps(nalUnit);
                if (sps && sps.maxDecFrameBuffering !== 0 && sps.bitstreamRestrictionFlag !== 1) {
                  filteredNalUnits[i3] = addAvcBitstreamRestriction(sps);
                }
                break;
              }
            }
            const newData = concatAvcNalUnits(filteredNalUnits, this.decoderConfig);
            packet = new EncodedPacket(newData, packet.type, packet.timestamp, packet.duration);
          } else if (this.codec === "hevc") {
            const sanitizedData = sanitizeHevcPacketForChromium(packet.data, this.decoderConfig);
            if (sanitizedData) {
              packet = new EncodedPacket(sanitizedData, packet.type, packet.timestamp, packet.duration);
            }
          }
        }
        this.decoder.decode(packet.toEncodedVideoChunk());
        this.decodeAlphaData(packet);
      }
      this.currentPacketIndex++;
    }
    decodeAlphaData(packet) {
      if (!packet.sideData.alpha) {
        this.pushNullAlphaFrame();
        return;
      }
      if (!this.merger) {
        this.merger = new ColorAlphaMerger();
      }
      if (!this.alphaDecoder) {
        const alphaHandler = (frame) => {
          if (this.colorQueue.length > 0) {
            const colorFrame = this.colorQueue.shift();
            assert(colorFrame !== void 0);
            void this.mergeAlpha(colorFrame, frame);
          } else {
            this.alphaQueue.push(frame);
          }
          this.decodedAlphaChunkCount++;
          while (this.nullAlphaFrameQueue.length > 0 && this.nullAlphaFrameQueue[0] === this.decodedAlphaChunkCount) {
            this.nullAlphaFrameQueue.shift();
            if (this.colorQueue.length > 0) {
              const colorFrame = this.colorQueue.shift();
              assert(colorFrame !== void 0);
              void this.mergeAlpha(colorFrame, null);
            } else {
              this.alphaQueue.push(null);
            }
          }
          this.alphaDecoderQueueSize--;
        };
        const stack = new Error("Decoding error").stack;
        this.alphaDecoder = new VideoDecoder({
          output: (frame) => {
            try {
              alphaHandler(frame);
            } catch (error) {
              this.onError(error);
            }
          },
          error: (error) => {
            error.stack = stack;
            this.onError(error);
          }
        });
        this.alphaDecoder.addEventListener("dequeue", () => {
          this.onDequeue?.();
        });
        this.alphaDecoder.configure({
          ...this.decoderConfig,
          // Alpha is always full range, regardless of what the color track says. The decoder only honors the
          // override if all fields are set tho.
          colorSpace: {
            fullRange: true,
            // These fields are irrelevant:
            matrix: "bt709",
            primaries: "bt709",
            transfer: "bt709"
          }
        });
      }
      const type = determineVideoPacketType(this.codec, this.decoderConfig, packet.sideData.alpha);
      if (!this.alphaHadKeyframe) {
        this.alphaHadKeyframe = type === "key";
      }
      if (this.alphaHadKeyframe) {
        if (this.codec === "hevc" && this.currentAlphaPacketIndex > 0 && !this.alphaRaslSkipped) {
          if (this.hasHevcRaslPicture(packet.sideData.alpha)) {
            this.pushNullAlphaFrame();
            return;
          }
          this.alphaRaslSkipped = true;
        }
        this.currentAlphaPacketIndex++;
        this.alphaDecoder.decode(packet.alphaToEncodedVideoChunk(type ?? packet.type));
        this.alphaDecoderQueueSize++;
      } else {
        this.pushNullAlphaFrame();
      }
    }
    pushNullAlphaFrame() {
      if (this.alphaDecoderQueueSize === 0) {
        this.alphaQueue.push(null);
      } else {
        this.nullAlphaFrameQueue.push(this.decodedAlphaChunkCount + this.alphaDecoderQueueSize);
      }
    }
    /**
     * If we're using HEVC, we need to make sure to skip any RASL slices that follow a non-IDR key frame such as
     * CRA_NUT. This is because RASL slices cannot be decoded without data before the CRA_NUT. Browsers behave
     * differently here: Chromium drops the packets, Safari throws a decoder error. Either way, it's not good
     * and causes bugs upstream. So, let's take the dropping into our own hands.
     */
    hasHevcRaslPicture(packetData) {
      for (const loc of iterateHevcNalUnits(packetData, this.decoderConfig)) {
        const type = extractNalUnitTypeForHevc(packetData[loc.offset]);
        if (type === HevcNalUnitType.RASL_N || type === HevcNalUnitType.RASL_R) {
          return true;
        }
      }
      return false;
    }
    /** Handler for the WebCodecs VideoDecoder for ironing out browser differences. */
    sampleHandler(sample) {
      if (isWebKit()) {
        if (this.sampleQueue.length > 0 && sample.timestamp >= last(this.sampleQueue).timestamp) {
          for (const sample2 of this.sampleQueue) {
            this.finalizeAndEmitSample(sample2);
          }
          this.sampleQueue.length = 0;
        }
        insertSorted(this.sampleQueue, sample, (x2) => x2.timestamp);
      } else {
        const timestamp = this.inputTimestamps.shift();
        assert(timestamp !== void 0);
        sample.setTimestamp(timestamp);
        this.finalizeAndEmitSample(sample);
      }
    }
    finalizeAndEmitSample(sample) {
      sample.setTimestamp(Math.round(sample.timestamp * this.timeResolution) / this.timeResolution);
      sample.setDuration(Math.round(sample.duration * this.timeResolution) / this.timeResolution);
      sample.setRotation(this.rotation);
      sample.setFlip(this.flip);
      this.onSample(sample);
    }
    async mergeAlpha(color, alpha) {
      const resolver = promiseWithResolvers();
      this.mergeAlphaPromises.push(resolver.promise);
      const result = { sample: null };
      this.finalSamples.push(result);
      try {
        if (!alpha) {
          result.sample = new VideoSample(color);
        } else {
          assert(this.merger);
          const finalFrame = await this.merger.merge(color, alpha);
          result.sample = new VideoSample(finalFrame);
        }
        while (this.finalSamples.length > 0 && this.finalSamples[0].sample !== null) {
          const next = this.finalSamples.shift();
          this.sampleHandler(next.sample);
        }
      } catch (error) {
        removeItem(this.finalSamples, result);
        this.onError(error);
      } finally {
        removeItem(this.mergeAlphaPromises, resolver.promise);
        resolver.resolve();
      }
    }
    async flush() {
      if (this.customDecoder) {
        await this.customDecoderCallSerializer.call(() => this.customDecoder.flush());
      } else {
        assert(this.decoder);
        await Promise.all([
          this.decoder.flush(),
          this.alphaDecoder?.flush()
        ]);
        await Promise.all(this.mergeAlphaPromises);
        this.colorQueue.forEach((x2) => x2.close());
        this.colorQueue.length = 0;
        this.alphaQueue.forEach((x2) => x2?.close());
        this.alphaQueue.length = 0;
        this.alphaHadKeyframe = false;
        this.decodedAlphaChunkCount = 0;
        this.alphaDecoderQueueSize = 0;
        this.nullAlphaFrameQueue.length = 0;
        this.currentAlphaPacketIndex = 0;
        this.alphaRaslSkipped = false;
      }
      if (isWebKit()) {
        for (const sample of this.sampleQueue) {
          this.finalizeAndEmitSample(sample);
        }
        this.sampleQueue.length = 0;
      }
      this.currentPacketIndex = 0;
      this.raslSkipped = false;
    }
    close() {
      if (this.customDecoder) {
        void this.customDecoderCallSerializer.call(() => this.customDecoder.close());
      } else {
        assert(this.decoder);
        if (this.decoder.state !== "closed") {
          this.decoder.close();
        }
        if (this.alphaDecoder && this.alphaDecoder.state !== "closed") {
          this.alphaDecoder.close();
        }
        this.colorQueue.forEach((x2) => x2.close());
        this.colorQueue.length = 0;
        this.alphaQueue.forEach((x2) => x2?.close());
        this.alphaQueue.length = 0;
        this.merger?.close();
      }
      for (const sample of this.sampleQueue) {
        sample.close();
      }
      this.sampleQueue.length = 0;
    }
  };
  var mergerWorkerUrl = null;
  var ColorAlphaMerger = class {
    constructor() {
      this.workers = [];
      this.nextWorkerIndex = 0;
      this.pendingRequests = /* @__PURE__ */ new Map();
      this.nextRequestId = 0;
    }
    merge(color, alpha) {
      if (this.workers.length === 0) {
        if (!mergerWorkerUrl) {
          const blob = new Blob([`(${colorAlphaMergerWorkerCode.toString()})()`], { type: "application/javascript" });
          mergerWorkerUrl = URL.createObjectURL(blob);
        }
        const poolSize = clamp5(navigator.hardwareConcurrency, 1, 4);
        for (let i3 = 0; i3 < poolSize; i3++) {
          const worker2 = new Worker(mergerWorkerUrl);
          worker2.addEventListener("message", (event) => {
            const data = event.data;
            const pending2 = this.pendingRequests.get(data.id);
            if (!pending2) {
              return;
            }
            this.pendingRequests.delete(data.id);
            if ("error" in data) {
              pending2.reject(new Error(data.error));
            } else {
              pending2.resolve(data.frame);
            }
          });
          worker2.addEventListener("error", (event) => {
            const error = new Error(event.message || "Color/alpha merge worker error.");
            for (const pending2 of this.pendingRequests.values()) {
              pending2.reject(error);
            }
            this.pendingRequests.clear();
          });
          this.workers.push(worker2);
        }
      }
      const id = this.nextRequestId++;
      const pending = promiseWithResolvers();
      this.pendingRequests.set(id, pending);
      const worker = this.workers[this.nextWorkerIndex];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
      worker.postMessage({ id, color, alpha }, { transfer: [color, alpha] });
      return pending.promise;
    }
    close() {
      for (const worker of this.workers) {
        worker.terminate();
      }
      this.workers.length = 0;
      const error = new Error("Color/alpha merger closed.");
      for (const pending of this.pendingRequests.values()) {
        pending.reject(error);
      }
      this.pendingRequests.clear();
    }
  };
  var colorAlphaMergerWorkerCode = () => {
    let cpuAlphaBuffer = null;
    let cpuColorBuffer = null;
    let chain = Promise.resolve();
    self.addEventListener("message", (event) => {
      const { id, color, alpha } = event.data;
      chain = chain.then(async () => {
        try {
          const frame = await merge3(color, alpha);
          self.postMessage({ id, frame }, { transfer: [frame] });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        } finally {
          color.close();
          alpha.close();
        }
      });
    });
    const merge3 = async (color, alpha) => {
      const format = color.format;
      const alphaFormat = alpha.format;
      if (!format || !alphaFormat) {
        throw new Error("CPU color/alpha merging requires a known VideoFrame format.");
      }
      const colorIs10 = format.includes("P10");
      const colorIs12 = format.includes("P12");
      const alphaIs10 = alphaFormat.includes("P10");
      const alphaIs12 = alphaFormat.includes("P12");
      if (alphaIs10 !== colorIs10 || alphaIs12 !== colorIs12) {
        throw new Error(`CPU color/alpha merging requires the alpha frame to have the same bit depth as the color frame (color: '${format}', alpha: '${alphaFormat}').`);
      }
      if (format === "RGBX" || format === "RGBA" || format === "BGRX" || format === "BGRA") {
        return await mergeInterleavedRgba(color, alpha, format);
      } else if (format === "I420" || format === "I420P10" || format === "I420P12" || format === "I422" || format === "I422P10" || format === "I422P12" || format === "I444" || format === "I444P10" || format === "I444P12") {
        return await mergePlanarYuv(color, alpha, format);
      } else if (format === "NV12") {
        return await mergeNv12(color, alpha);
      }
      throw new Error(`CPU color/alpha merging does not support format '${format}'.`);
    };
    const mergeInterleavedRgba = async (color, alpha, format) => {
      const width = color.visibleRect?.width ?? color.codedWidth;
      const height = color.visibleRect?.height ?? color.codedHeight;
      const pixelCount = width * height;
      const output = new Uint8Array(pixelCount * 4);
      await color.copyTo(output);
      const alphaY = await readAlpha(alpha, width, height, 1);
      for (let i3 = 0, j3 = 3; i3 < pixelCount; i3++, j3 += 4) {
        output[j3] = alphaY[i3];
      }
      const outputFormat = format === "RGBX" || format === "RGBA" ? "RGBA" : "BGRA";
      const init = {
        format: outputFormat,
        codedWidth: width,
        codedHeight: height,
        timestamp: color.timestamp,
        duration: color.duration ?? void 0,
        transfer: [output.buffer]
      };
      return new VideoFrame(output, init);
    };
    const mergePlanarYuv = async (color, alpha, format) => {
      const width = color.visibleRect?.width ?? color.codedWidth;
      const height = color.visibleRect?.height ?? color.codedHeight;
      const is10 = format.includes("P10");
      const is12 = format.includes("P12");
      const bytesPerSample = is10 || is12 ? 2 : 1;
      let chromaW;
      let chromaH;
      if (format.startsWith("I420")) {
        chromaW = Math.ceil(width / 2);
        chromaH = Math.ceil(height / 2);
      } else if (format.startsWith("I422")) {
        chromaW = Math.ceil(width / 2);
        chromaH = height;
      } else {
        chromaW = width;
        chromaH = height;
      }
      const ySamples = width * height;
      const uvSamples = chromaW * chromaH;
      const yBytes = ySamples * bytesPerSample;
      const uvBytes = uvSamples * bytesPerSample;
      const aBytes = ySamples * bytesPerSample;
      const outputBytes = yBytes + 2 * uvBytes + aBytes;
      const output = new Uint8Array(outputBytes);
      await color.copyTo(output);
      const alphaY = await readAlpha(alpha, width, height, bytesPerSample);
      const aOffset = yBytes + 2 * uvBytes;
      output.set(alphaY, aOffset);
      const outputFormat = format.slice(0, 4) + "A" + format.slice(4);
      const init = {
        format: outputFormat,
        codedWidth: width,
        codedHeight: height,
        timestamp: color.timestamp,
        duration: color.duration ?? void 0,
        transfer: [output.buffer]
      };
      return new VideoFrame(output, init);
    };
    const mergeNv12 = async (color, alpha) => {
      const width = color.visibleRect?.width ?? color.codedWidth;
      const height = color.visibleRect?.height ?? color.codedHeight;
      const ySize = width * height;
      const chromaW = Math.ceil(width / 2);
      const chromaH = Math.ceil(height / 2);
      const uvSize = chromaW * chromaH;
      const sourceSize2 = color.allocationSize();
      if (!cpuColorBuffer || cpuColorBuffer.byteLength !== sourceSize2) {
        cpuColorBuffer = new Uint8Array(sourceSize2);
      }
      await color.copyTo(cpuColorBuffer);
      const output = new Uint8Array(ySize + 2 * uvSize + ySize);
      output.set(cpuColorBuffer.subarray(0, ySize), 0);
      const uOffset = ySize;
      const vOffset = ySize + uvSize;
      const uvStart = ySize;
      for (let i3 = 0; i3 < uvSize; i3++) {
        output[uOffset + i3] = cpuColorBuffer[uvStart + i3 * 2];
        output[vOffset + i3] = cpuColorBuffer[uvStart + i3 * 2 + 1];
      }
      const alphaY = await readAlpha(alpha, width, height, 1);
      output.set(alphaY, ySize + 2 * uvSize);
      const init = {
        format: "I420A",
        codedWidth: width,
        codedHeight: height,
        timestamp: color.timestamp,
        duration: color.duration ?? void 0,
        transfer: [output.buffer]
      };
      return new VideoFrame(output, init);
    };
    const readAlpha = async (alpha, width, height, bytesPerSample) => {
      const size = alpha.allocationSize();
      if (!cpuAlphaBuffer || cpuAlphaBuffer.byteLength !== size) {
        cpuAlphaBuffer = new Uint8Array(size);
      }
      await alpha.copyTo(cpuAlphaBuffer);
      const format = alpha.format;
      if (format === "RGBA" || format === "BGRA" || format === "RGBX" || format === "BGRX") {
        const rOffset = format === "RGBA" || format === "RGBX" ? 0 : 2;
        const pixelCount = width * height;
        for (let i3 = 0; i3 < pixelCount; i3++) {
          cpuAlphaBuffer[i3] = cpuAlphaBuffer[i3 * 4 + rOffset];
        }
        return cpuAlphaBuffer.subarray(0, pixelCount);
      } else {
        const yPlane = cpuAlphaBuffer.subarray(0, width * height * bytesPerSample);
        if (alpha.colorSpace.fullRange === false) {
          const bitDepth = format.includes("P12") ? 12 : format.includes("P10") ? 10 : 8;
          const low = 16 << bitDepth - 8;
          const high = 235 << bitDepth - 8;
          const max = (1 << bitDepth) - 1;
          const samples = bytesPerSample === 2 ? new Uint16Array(yPlane.buffer, 0, width * height) : yPlane;
          for (let i3 = 0; i3 < samples.length; i3++) {
            const value = Math.round((samples[i3] - low) * max / (high - low));
            samples[i3] = Math.min(Math.max(value, 0), max);
          }
        }
        return yPlane;
      }
    };
  };
  var validateVideoSinkDecoderOptions = (decoderOptions) => {
    if (!decoderOptions || typeof decoderOptions !== "object") {
      throw new TypeError("decoderOptions must be an object.");
    }
    if (decoderOptions.hardwareAcceleration !== void 0 && !["no-preference", "prefer-hardware", "prefer-software"].includes(decoderOptions.hardwareAcceleration)) {
      throw new TypeError("decoderOptions.hardwareAcceleration, when provided, must be 'no-preference', 'prefer-hardware' or 'prefer-software'.");
    }
    if (decoderOptions.optimizeForLatency !== void 0 && typeof decoderOptions.optimizeForLatency !== "boolean") {
      throw new TypeError("decoderOptions.optimizeForLatency, when provided, must be a boolean.");
    }
  };
  var VideoSampleSink = class extends BaseMediaSampleSink {
    /** Creates a new {@link VideoSampleSink} for the given {@link InputVideoTrack}. */
    constructor(videoTrack, decoderOptions = {}) {
      if (!(videoTrack instanceof InputVideoTrack)) {
        throw new TypeError("videoTrack must be an InputVideoTrack.");
      }
      validateVideoSinkDecoderOptions(decoderOptions);
      super();
      this._track = videoTrack;
      this._decoderOptions = decoderOptions;
    }
    /** @internal */
    async _createDecoder(onSample, onError) {
      if (!await this._track.canDecode()) {
        if (typeof VideoDecoder === "undefined") {
          throw new Error(missingWebCodecsClassMessage("VideoDecoder"));
        }
        throw new Error("This video track cannot be decoded in this environment. Make sure to check decodability before using a track.");
      }
      const codec = await this._track.getCodec();
      const rotation = await this._track.getRotation();
      const flip = await this._track.getFlip();
      let decoderConfig = await this._track.getDecoderConfig();
      const timeResolution = await this._track.getTimeResolution();
      assert(codec && decoderConfig);
      decoderConfig = {
        ...decoderConfig,
        hardwareAcceleration: this._decoderOptions.hardwareAcceleration,
        optimizeForLatency: this._decoderOptions.optimizeForLatency
      };
      return new VideoDecoderWrapper(onSample, onError, codec, decoderConfig, rotation, flip, timeResolution);
    }
    /** @internal */
    _createPacketSink() {
      return new EncodedPacketSink(this._track);
    }
    /**
     * Retrieves the video sample (frame) corresponding to the given timestamp, in seconds. More specifically, returns
     * the last video sample (in presentation order) with a start timestamp less than or equal to the given timestamp.
     * Returns null if the timestamp is before the track's first timestamp.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     * @param options - Options used for the underlying packet retrieval.
     */
    async getSample(timestamp, options = {}) {
      validateTimestamp(timestamp);
      for await (const sample of this.mediaSamplesAtTimestamps([timestamp], options)) {
        return sample;
      }
      throw new Error("Internal error: Iterator returned nothing.");
    }
    /**
     * Creates an async iterator that yields the video samples (frames) of this track in presentation order. This method
     * will intelligently pre-decode a few frames ahead to enable fast iteration.
     *
     * @param startTimestamp - The timestamp in seconds at which to start yielding samples (inclusive).
     * @param endTimestamp - The timestamp in seconds at which to stop yielding samples (exclusive).
     * @param options - Options used for the underlying packet retrieval.
     */
    samples(startTimestamp, endTimestamp, options = {}) {
      return this.mediaSamplesInRange(startTimestamp, endTimestamp, options);
    }
    /**
     * Creates an async iterator that yields a video sample (frame) for each timestamp in the argument. This method
     * uses an optimized decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most
     * once, and is therefore more efficient than manually getting the sample for every timestamp. The iterator may
     * yield null if no frame is available for a given timestamp.
     *
     * This method is good for sparse access of media data. If you want primarily sequential media access, prefer
     * {@link VideoSampleSink.samples} instead.
     *
     * @param timestamps - An iterable or async iterable of timestamps in seconds.
     * @param options - Options used for the underlying packet retrieval.
     */
    samplesAtTimestamps(timestamps, options = {}) {
      return this.mediaSamplesAtTimestamps(timestamps, options);
    }
  };
  var CanvasSink = class {
    /** Creates a new {@link CanvasSink} for the given {@link InputVideoTrack}. */
    constructor(videoTrack, options = {}) {
      this._rotation = 0;
      this._flip = false;
      this._initPromise = null;
      this._nextCanvasIndex = 0;
      if (!(videoTrack instanceof InputVideoTrack)) {
        throw new TypeError("videoTrack must be an InputVideoTrack.");
      }
      if (options && typeof options !== "object") {
        throw new TypeError("options must be an object.");
      }
      if (options.alpha !== void 0 && typeof options.alpha !== "boolean") {
        throw new TypeError("options.alpha, when provided, must be a boolean.");
      }
      if (options.width !== void 0 && (!Number.isInteger(options.width) || options.width <= 0)) {
        throw new TypeError("options.width, when defined, must be a positive integer.");
      }
      if (options.height !== void 0 && (!Number.isInteger(options.height) || options.height <= 0)) {
        throw new TypeError("options.height, when defined, must be a positive integer.");
      }
      if (options.fit !== void 0 && !["fill", "contain", "cover"].includes(options.fit)) {
        throw new TypeError('options.fit, when provided, must be one of "fill", "contain", or "cover".');
      }
      if (options.width !== void 0 && options.height !== void 0 && options.fit === void 0) {
        throw new TypeError("When both options.width and options.height are provided, options.fit must also be provided.");
      }
      if (options.rotation !== void 0 && ![0, 90, 180, 270].includes(options.rotation)) {
        throw new TypeError("options.rotation, when provided, must be 0, 90, 180 or 270.");
      }
      if (options.flip !== void 0 && typeof options.flip !== "boolean") {
        throw new TypeError("options.flip, when provided, must be a boolean.");
      }
      if (options.crop !== void 0) {
        validateCropRectangle(options.crop, "options.");
      }
      if (options.poolSize !== void 0 && (typeof options.poolSize !== "number" || !Number.isInteger(options.poolSize) || options.poolSize < 0)) {
        throw new TypeError("poolSize must be a non-negative integer.");
      }
      if (options.decoderOptions !== void 0) {
        validateVideoSinkDecoderOptions(options.decoderOptions);
      }
      this._videoTrack = videoTrack;
      this._alpha = options.alpha ?? false;
      this._options = options;
      this._fit = options.fit ?? "fill";
      this._videoSampleSink = new VideoSampleSink(videoTrack, options.decoderOptions);
      this._canvasPool = Array.from({ length: options.poolSize ?? 0 }, () => null);
    }
    /** @internal */
    _ensureInit() {
      return this._initPromise ??= (async () => {
        const options = this._options;
        const videoTrack = this._videoTrack;
        const rotation = options.rotation ?? await videoTrack.getRotation();
        const flip = options.flip ?? await videoTrack.getFlip();
        const squarePixelWidth = await videoTrack.getSquarePixelWidth();
        const squarePixelHeight = await videoTrack.getSquarePixelHeight();
        const [rotatedWidth, rotatedHeight] = rotation % 180 === 0 ? [squarePixelWidth, squarePixelHeight] : [squarePixelHeight, squarePixelWidth];
        let crop = options.crop;
        if (crop) {
          crop = clampCropRectangle(crop, rotatedWidth, rotatedHeight);
        }
        let [width, height] = crop ? [crop.width, crop.height] : [rotatedWidth, rotatedHeight];
        const originalAspectRatio = width / height;
        if (options.width !== void 0 && options.height === void 0) {
          width = options.width;
          height = Math.round(width / originalAspectRatio);
        } else if (options.width === void 0 && options.height !== void 0) {
          height = options.height;
          width = Math.round(height * originalAspectRatio);
        } else if (options.width !== void 0 && options.height !== void 0) {
          width = options.width;
          height = options.height;
        }
        this._width = width;
        this._height = height;
        this._rotation = rotation;
        this._flip = flip;
        this._crop = crop;
      })();
    }
    /** @internal */
    _videoSampleToWrappedCanvas(sample) {
      const width = this._width;
      const height = this._height;
      let canvas = this._canvasPool[this._nextCanvasIndex];
      let canvasIsNew = false;
      if (!canvas) {
        if (typeof document !== "undefined") {
          canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
        } else {
          canvas = new OffscreenCanvas(width, height);
        }
        if (this._canvasPool.length > 0) {
          this._canvasPool[this._nextCanvasIndex] = canvas;
        }
        canvasIsNew = true;
      }
      if (this._canvasPool.length > 0) {
        this._nextCanvasIndex = (this._nextCanvasIndex + 1) % this._canvasPool.length;
      }
      const context = canvas.getContext("2d", {
        alpha: this._alpha || isFirefox()
        // Firefox has VideoFrame glitches with opaque canvases
      });
      assert(context);
      sample._drawWithFitAndMipmapping(canvas, context, {
        fit: this._fit,
        rotation: this._rotation,
        flip: this._flip,
        crop: this._crop,
        targetIsFresh: canvasIsNew,
        fillBlack: !this._alpha && isFirefox()
      });
      const result = {
        canvas,
        timestamp: sample.timestamp,
        duration: sample.duration
      };
      sample.close();
      return result;
    }
    /**
     * Retrieves a canvas with the video frame corresponding to the given timestamp, in seconds. More specifically,
     * returns the last video frame (in presentation order) with a start timestamp less than or equal to the given
     * timestamp. Returns null if the timestamp is before the track's first timestamp.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     * @param options - Options used for the underlying packet retrieval.
     */
    async getCanvas(timestamp, options) {
      validateTimestamp(timestamp);
      await this._ensureInit();
      const sample = await this._videoSampleSink.getSample(timestamp, options);
      return sample && this._videoSampleToWrappedCanvas(sample);
    }
    /**
     * Creates an async iterator that yields canvases with the video frames of this track in presentation order. This
     * method will intelligently pre-decode a few frames ahead to enable fast iteration.
     *
     * @param startTimestamp - The timestamp in seconds at which to start yielding canvases (inclusive).
     * @param endTimestamp - The timestamp in seconds at which to stop yielding canvases (exclusive).
     * @param options - Options used for the underlying packet retrieval.
     */
    async *canvases(startTimestamp, endTimestamp, options) {
      await this._ensureInit();
      yield* mapAsyncGenerator(this._videoSampleSink.samples(startTimestamp, endTimestamp, options), (sample) => this._videoSampleToWrappedCanvas(sample));
    }
    /**
     * Creates an async iterator that yields a canvas for each timestamp in the argument. This method uses an optimized
     * decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most once, and is
     * therefore more efficient than manually getting the canvas for every timestamp. The iterator may yield null if
     * no frame is available for a given timestamp.
     *
     * This method is good for sparse access of media data. If you want primarily sequential media access, prefer
     * {@link CanvasSink.canvases} instead.
     *
     * @param timestamps - An iterable or async iterable of timestamps in seconds.
     * @param options - Options used for the underlying packet retrieval.
     */
    async *canvasesAtTimestamps(timestamps, options) {
      await this._ensureInit();
      yield* mapAsyncGenerator(this._videoSampleSink.samplesAtTimestamps(timestamps, options), (sample) => sample && this._videoSampleToWrappedCanvas(sample));
    }
  };

  // node_modules/mediabunny/dist/modules/src/input-track.js
  var InputTrack = class _InputTrack {
    /** @internal */
    constructor(input, backing) {
      this.input = input;
      this._backing = backing;
    }
    /** Returns true if and only if this track is a video track. */
    isVideoTrack() {
      return this instanceof InputVideoTrack;
    }
    /** Returns true if and only if this track is an audio track. */
    isAudioTrack() {
      return this instanceof InputAudioTrack;
    }
    /** The unique ID of this track in the input file. */
    get id() {
      return this._backing.getId();
    }
    /**
     * The 1-based index of this track among all tracks of the same type in the input file. For example, the first
     * video track has number 1, the second video track has number 2, and so on. The index refers to the order in
     * which the tracks are returned by {@link Input.getTracks}.
     */
    get number() {
      return this._backing.getNumber();
    }
    /**
     * Returns the identifier of the codec used internally by the container. It is not homogenized by Mediabunny
     * and depends entirely on the container format.
     *
     * This method can be used to determine the codec of a track in case Mediabunny doesn't know that codec.
     *
     * - For ISOBMFF files, this resolves to the name of the Sample Description Box (e.g. `'avc1'`).
     * - For Matroska files, this resolves to the value of the `CodecID` element.
     * - For WAVE files, this resolves to the value of the format tag in the `'fmt '` chunk.
     * - For ADTS files, this resolves to the `MPEG-4 Audio Object Type`.
     * - For MPEG-TS files, this resolves to the `streamType` value from the Program Map Table.
     * - In all other cases, this resolves to `null`.
     */
    async getInternalCodecId() {
      return this._backing.getInternalCodecId();
    }
    /**
     * See {@link InputTrack.getInternalCodecId}.
     * @deprecated Use {@link InputTrack.getInternalCodecId} instead.
     */
    get internalCodecId() {
      return requireSync(this._backing.getInternalCodecId(), "internalCodecId", "getInternalCodecId");
    }
    /**
     * Returns the ISO 639-2/T language code for this track. If the language is unknown, this resolves to `'und'`
     * (undetermined).
     */
    async getLanguageCode() {
      return this._backing.getLanguageCode();
    }
    /**
     * The ISO 639-2/T language code for this track. If the language is unknown, this field is `'und'` (undetermined).
     * @deprecated Use {@link InputTrack.getLanguageCode} instead.
     */
    get languageCode() {
      return requireSync(this._backing.getLanguageCode(), "languageCode", "getLanguageCode");
    }
    /** Returns the user-defined name for this track. */
    async getName() {
      return this._backing.getName();
    }
    /**
     * A user-defined name for this track.
     * @deprecated Use {@link InputTrack.getName} instead.
     */
    get name() {
      return requireSync(this._backing.getName(), "name", "getName");
    }
    /**
     * Returns a positive number x such that all timestamps and durations of all packets of this track are
     * integer multiples of 1/x.
     */
    async getTimeResolution() {
      return this._backing.getTimeResolution();
    }
    /**
     * A positive number x such that all timestamps and durations of all packets of this track are
     * integer multiples of 1/x.
     * @deprecated Use {@link InputTrack.getTimeResolution} instead.
     */
    get timeResolution() {
      return requireSync(this._backing.getTimeResolution(), "timeResolution", "getTimeResolution");
    }
    /**
     * Returns whether the timestamps of this track are relative to the Unix epoch (January 1, 1970 00:00:00 UTC).
     * When `true`, each timestamp maps to a definitive point in time.
     */
    async isRelativeToUnixEpoch() {
      return this._backing.isRelativeToUnixEpoch();
    }
    /**
     * Returns the Unix time (in seconds since January 1, 1970 00:00:00 UTC) that the given track timestamp (in seconds)
     * maps to, or `null` if there is no such mapping. This provides a piecewise-continuous mapping from this track's
     * timestamp space into wall-clock time. Such mapping exists, for example, for HLS playlists with
     * `#EXT-X-PROGRAM-DATE-TIME` tags present.
     *
     * This mapping can be available even when {@link InputTrack.isRelativeToUnixEpoch} is `false`, for example for HLS
     * streams with program date time information but with {@link HlsInputFormatOptions.offsetTimestampsByDateTime}
     * set to `false`.
     */
    async getUnixTimeForTimestamp(timestamp) {
      return this._backing.getUnixTimeForTimestamp(timestamp);
    }
    /**
     * Whether the track's timestamps can be mapped to Unix wall clock time via
     * {@link InputTrack.getUnixTimeForTimestamp}.
     */
    async hasUnixTimeMapping() {
      return await this._backing.getUnixTimeForTimestamp(await this.getFirstTimestamp()) !== null;
    }
    /** Returns the track's disposition, i.e. information about its intended usage. */
    async getDisposition() {
      return this._backing.getDisposition();
    }
    /**
     * The track's disposition, i.e. information about its intended usage.
     * @deprecated Use {@link InputTrack.getDisposition} instead.
     */
    get disposition() {
      return requireSync(this._backing.getDisposition(), "disposition", "getDisposition");
    }
    /**
     * Returns the peak bitrate of the track in bits per second, as specified in the track's metadata. This might not
     * match the actual media data's bitrate.
     */
    async getBitrate() {
      return this._backing.getBitrate();
    }
    /**
     * Returns the average bitrate of the track in bits per second, as specified in the track's metadata. This might
     * not match the actual media data's bitrate.
     */
    async getAverageBitrate() {
      return this._backing.getAverageBitrate();
    }
    /**
     * Returns the start timestamp of the first packet of this track, in seconds. While often near zero, this value
     * may be positive or even negative. A negative starting timestamp means the track's timing has been offset. Samples
     * with a negative timestamp should not be presented.
     */
    async getFirstTimestamp() {
      const firstPacket = await this._backing.getFirstPacket({ metadataOnly: true });
      return firstPacket?.timestamp ?? 0;
    }
    /**
     * Returns the end timestamp of the last packet of this track, in seconds.
     *
     * By default, when the underlying media is live, this method will only resolve once the live stream ends. If you
     * want to query the current end timestamp of the stream, set {@link PacketRetrievalOptions.skipLiveWait} to `true`
     * in the options.
     */
    async computeDuration(options) {
      const lastPacket = await this._backing.getPacket(Infinity, { metadataOnly: true, ...options });
      const result = (lastPacket?.timestamp ?? 0) + (lastPacket?.duration ?? 0);
      return roundToDivisor(result, await this.getTimeResolution());
    }
    /**
     * Gets the duration (end timestamp) in seconds of this track from metadata stored in the file. This value may be
     * approximate or diverge from the actual, precise duration returned by `.computeDuration()`, but compared to that
     * method, this method is cheaper. When the duration cannot be determined from the file metadata, `null`
     * is returned.
     *
     * By default, when the underlying media is live, this method will only resolve once the live stream
     * ends. If you want to query the current duration of the media, set
     * {@link DurationMetadataRequestOptions.skipLiveWait} to `true` in the options.
     */
    async getDurationFromMetadata(options = {}) {
      return this._backing.getDurationFromMetadata(options);
    }
    /**
     * Computes aggregate packet statistics for this track, such as average packet rate or bitrate.
     *
     * @param targetPacketCount - This optional parameter sets a target for how many packets this method must have
     * looked at before it can return early; this means, you can use it to aggregate only a subset (prefix) of all
     * packets. This is very useful for getting a great estimate of video frame rate without having to scan through the
     * entire file.
     *
     * By default, when the underlying media is live and `targetPacketCount` is not set, this method will only resolve
     * once the live stream ends. If you want to query the current packet statistics of the stream, set
     * {@link PacketRetrievalOptions.skipLiveWait} to `true` in the options.
     */
    async computePacketStats(targetPacketCount = Infinity, options) {
      const sink = new EncodedPacketSink(this);
      let startTimestamp = Infinity;
      let endTimestamp = -Infinity;
      let packetCount = 0;
      let totalPacketBytes = 0;
      for await (const packet of sink.packets(void 0, void 0, { metadataOnly: true, ...options })) {
        if (packetCount >= targetPacketCount && packet.timestamp >= endTimestamp) {
          break;
        }
        startTimestamp = Math.min(startTimestamp, packet.timestamp);
        endTimestamp = Math.max(endTimestamp, packet.timestamp + packet.duration);
        packetCount++;
        totalPacketBytes += packet.byteLength;
      }
      return {
        packetCount,
        averagePacketRate: packetCount ? Number((packetCount / (endTimestamp - startTimestamp)).toPrecision(16)) : 0,
        averageBitrate: packetCount ? Number((8 * totalPacketBytes / (endTimestamp - startTimestamp)).toPrecision(16)) : 0
      };
    }
    /**
     * Whether or not this track is currently live, meaning the media's end is still unknown.
     *
     * The value returned by this method may change over time as the track stops being live. To keep track of the
     * track's live status, poll this method at the track's refresh interval
     * via {@link InputTrack.getLiveRefreshInterval}.
     */
    async isLive() {
      return await this._backing.getLiveRefreshInterval() !== null;
    }
    /**
     * Returns the track's live refresh interval in seconds, or `null` if the track is not live. This interval describes
     * the time it takes, on average, for new live media data to become available.
     */
    async getLiveRefreshInterval() {
      return this._backing.getLiveRefreshInterval();
    }
    /**
     * Returns `true` if this track can be paired with the given track. Two tracks being pairable means they can be
     * presented (displayed) together.
     *
     * Returns `false` if `other` equals `this`.
     */
    canBePairedWith(other) {
      if (!(other instanceof _InputTrack)) {
        throw new TypeError("other must be an InputTrack.");
      }
      if (this.input !== other.input || this === other) {
        return false;
      }
      return (this._backing.getPairingMask() & other._backing.getPairingMask()) !== 0n;
    }
    /**
     * Gets the list of other tracks that can be paired with this track. An optional query can be provided to narrow
     * down the results.
     */
    async getPairableTracks(query) {
      return this.input.getTracks(mergeInputTrackQueries({
        filter: (t3) => t3.canBePairedWith(this)
      }, query));
    }
    /**
     * Gets the list of other video tracks that can be paired with this track. An optional query can be provided to
     * narrow down the results.
     */
    async getPairableVideoTracks(query) {
      return this.input.getVideoTracks(mergeInputTrackQueries({
        filter: (t3) => t3.canBePairedWith(this)
      }, query));
    }
    /**
     * Gets the list of other audio tracks that can be paired with this track. An optional query can be provided to
     * narrow down the results.
     */
    async getPairableAudioTracks(query) {
      return this.input.getAudioTracks(mergeInputTrackQueries({
        filter: (t3) => t3.canBePairedWith(this)
      }, query));
    }
    /** Returns the primary track that can be paired with this track, optionally steered by the provided query. */
    async getPrimaryPairableVideoTrack(query) {
      return this.input.getPrimaryVideoTrack(mergeInputTrackQueries({
        filter: (t3) => t3.canBePairedWith(this)
      }, query));
    }
    /** Returns the primary track that can be paired with this track, optionally steered by the provided query. */
    async getPrimaryPairableAudioTrack(query) {
      return this.input.getPrimaryAudioTrack(mergeInputTrackQueries({
        filter: (t3) => t3.canBePairedWith(this)
      }, query));
    }
    /** Returns `true` if there is another track that can be paired with this track. */
    async hasPairableTrack(predicate) {
      predicate &&= toValidatedPredicate(predicate);
      const tracks = await this.input.getTracks();
      for (const track of tracks) {
        if (!this.canBePairedWith(track)) {
          continue;
        }
        if (!predicate || await predicate(track)) {
          return true;
        }
      }
      return false;
    }
    /** Returns `true` if there is a video track that can be paired with this track. */
    hasPairableVideoTrack(predicate) {
      predicate &&= toValidatedPredicate(predicate);
      return this.hasPairableTrack(async (x2) => x2.isVideoTrack() && (!predicate || await predicate(x2)));
    }
    /** Returns `true` if there is an audio track that can be paired with this track. */
    hasPairableAudioTrack(predicate) {
      predicate &&= toValidatedPredicate(predicate);
      return this.hasPairableTrack(async (x2) => x2.isAudioTrack() && (!predicate || await predicate(x2)));
    }
  };
  var requireSync = (value, getterName, asyncName) => {
    if (isThenable(value)) {
      throw new Error(`'${getterName}' is deprecated and not available synchronously for this track. Use the preferred '${asyncName}()' instead.`);
    }
    return value;
  };
  var toValidatedPredicate = (predicate) => {
    if (predicate !== void 0 && typeof predicate !== "function") {
      throw new TypeError("predicate, when provided, must be a function.");
    }
    return predicate ? (track) => {
      const handle = (result2) => {
        if (typeof result2 !== "boolean") {
          throw new TypeError("predicate must return or resolve to a boolean value.");
        }
        return result2;
      };
      const result = predicate(track);
      if (isThenable(result)) {
        return result.then(handle);
      }
      return handle(result);
    } : void 0;
  };
  var InputVideoTrack = class extends InputTrack {
    /** @internal */
    constructor(input, backing) {
      super(input, backing);
      this._pixelAspectRatioCache = null;
    }
    get type() {
      return "video";
    }
    /** The codec of the track's packets. */
    async getCodec() {
      return this._backing.getCodec();
    }
    /**
     * The codec of the track's packets.
     * @deprecated Use {@link InputVideoTrack.getCodec} instead.
     */
    get codec() {
      return requireSync(this._backing.getCodec(), "codec", "getCodec");
    }
    async hasOnlyKeyPackets() {
      return await this._backing.getHasOnlyKeyPackets?.() ?? await this._backing.getCodec() === "prores";
    }
    /** Returns the width in pixels of the track's coded samples, before any transformations or rotations. */
    async getCodedWidth() {
      return this._backing.getCodedWidth();
    }
    /**
     * The width in pixels of the track's coded samples, before any transformations or rotations.
     * @deprecated Use {@link InputVideoTrack.getCodedWidth} instead.
     */
    get codedWidth() {
      return requireSync(this._backing.getCodedWidth(), "codedWidth", "getCodedWidth");
    }
    /** Returns the height in pixels of the track's coded samples, before any transformations or rotations. */
    async getCodedHeight() {
      return this._backing.getCodedHeight();
    }
    /**
     * The height in pixels of the track's coded samples, before any transformations or rotations.
     * @deprecated Use {@link InputVideoTrack.getCodedHeight} instead.
     */
    get codedHeight() {
      return requireSync(this._backing.getCodedHeight(), "codedHeight", "getCodedHeight");
    }
    /**
     * Returns the row-major 3x3 affine transformation matrix that is used to transform the raw video frames before they
     * are displayed. The raw frames are assumed to be placed with their top-left corner at the origin (0,0).
     *
     * Usually, this matrix models a rotation and a flip. Depending on the file, it may also contain a translation
     * component. When displaying video, you should typically ignore the translation component and display the center of
     * the transformed frame in the center of the viewport.
     */
    async getTransformationMatrix() {
      return this._backing.getTransformationMatrix();
    }
    /**
     * Returns the angle in degrees by which the track's frames should be rotated (clockwise). The rotation is
     * applied before flipping.
     */
    async getRotation() {
      return extractRotationFromMatrix(await this._backing.getTransformationMatrix());
    }
    /**
     * The angle in degrees by which the track's frames should be rotated (clockwise).
     * @deprecated Use {@link InputVideoTrack.getRotation} instead.
     */
    get rotation() {
      return extractRotationFromMatrix(requireSync(this._backing.getTransformationMatrix(), "rotation", "getRotation"));
    }
    /**
     * Returns whether the track's frames should be flipped horizontally (about the vertical axis), after rotation.
     */
    async getFlip() {
      return matrixIsFlipped(await this._backing.getTransformationMatrix());
    }
    /**
     * Returns the width of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
     */
    async getSquarePixelWidth() {
      return this._backing.getSquarePixelWidth();
    }
    /**
     * The width of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
     * @deprecated Use {@link InputVideoTrack.getSquarePixelWidth} instead.
     */
    get squarePixelWidth() {
      return requireSync(this._backing.getSquarePixelWidth(), "squarePixelWidth", "getSquarePixelWidth");
    }
    /**
     * Returns the height of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
     */
    async getSquarePixelHeight() {
      return this._backing.getSquarePixelHeight();
    }
    /**
     * The height of the track's frames in square pixels, adjusted for pixel aspect ratio but before rotation.
     * @deprecated Use {@link InputVideoTrack.getSquarePixelHeight} instead.
     */
    get squarePixelHeight() {
      return requireSync(this._backing.getSquarePixelHeight(), "squarePixelHeight", "getSquarePixelHeight");
    }
    /**
     * Returns the pixel aspect ratio of the track's frames as a rational number in its reduced form. Most videos use
     * square pixels (1:1).
     */
    async getPixelAspectRatio() {
      return this._pixelAspectRatioCache ??= simplifyRational({
        num: await this.getSquarePixelWidth() * await this.getCodedHeight(),
        den: await this.getSquarePixelHeight() * await this.getCodedWidth()
      });
    }
    /**
     * The pixel aspect ratio of the track's frames, as a rational number in its reduced form. Most videos use
     * square pixels (1:1).
     * @deprecated Use {@link InputVideoTrack.getPixelAspectRatio} instead.
     */
    get pixelAspectRatio() {
      return this._pixelAspectRatioCache ??= simplifyRational({
        num: requireSync(this._backing.getSquarePixelWidth(), "pixelAspectRatio", "getPixelAspectRatio") * requireSync(this._backing.getCodedHeight(), "pixelAspectRatio", "getPixelAspectRatio"),
        den: requireSync(this._backing.getSquarePixelHeight(), "pixelAspectRatio", "getPixelAspectRatio") * requireSync(this._backing.getCodedWidth(), "pixelAspectRatio", "getPixelAspectRatio")
      });
    }
    /** Returns the display width of the track's frames in pixels, after aspect ratio adjustment and rotation. */
    async getDisplayWidth() {
      const metadata = await this._backing.getMetadataDisplayWidth?.();
      if (metadata != null) {
        return metadata;
      }
      const rotation = await this.getRotation();
      return rotation % 180 === 0 ? this.getSquarePixelWidth() : this.getSquarePixelHeight();
    }
    /**
     * The display width of the track's frames in pixels, after aspect ratio adjustment and rotation.
     * @deprecated Use {@link InputVideoTrack.getDisplayWidth} instead.
     */
    get displayWidth() {
      const metadataRaw = this._backing.getMetadataDisplayWidth?.();
      if (metadataRaw !== void 0) {
        const metadata = requireSync(metadataRaw, "displayWidth", "getDisplayWidth");
        if (metadata !== null) {
          return metadata;
        }
      }
      const rotation = extractRotationFromMatrix(requireSync(this._backing.getTransformationMatrix(), "displayWidth", "getDisplayWidth"));
      const value = rotation % 180 === 0 ? this._backing.getSquarePixelWidth() : this._backing.getSquarePixelHeight();
      return requireSync(value, "displayWidth", "getDisplayWidth");
    }
    /** Returns the display height of the track's frames in pixels, after aspect ratio adjustment and rotation. */
    async getDisplayHeight() {
      const metadata = await this._backing.getMetadataDisplayHeight?.();
      if (metadata != null) {
        return metadata;
      }
      const rotation = await this.getRotation();
      return rotation % 180 === 0 ? this.getSquarePixelHeight() : this.getSquarePixelWidth();
    }
    /**
     * The display height of the track's frames in pixels, after aspect ratio adjustment and rotation.
     * @deprecated Use {@link InputVideoTrack.getDisplayHeight} instead.
     */
    get displayHeight() {
      const metadataRaw = this._backing.getMetadataDisplayHeight?.();
      if (metadataRaw !== void 0) {
        const metadata = requireSync(metadataRaw, "displayHeight", "getDisplayHeight");
        if (metadata !== null) {
          return metadata;
        }
      }
      const rotation = extractRotationFromMatrix(requireSync(this._backing.getTransformationMatrix(), "displayHeight", "getDisplayHeight"));
      const value = rotation % 180 === 0 ? this._backing.getSquarePixelHeight() : this._backing.getSquarePixelWidth();
      return requireSync(value, "displayHeight", "getDisplayHeight");
    }
    /** Returns the color space of the track's samples. */
    async getColorSpace() {
      return this._backing.getColorSpace();
    }
    /** If this method returns true, the track's samples use a high dynamic range (HDR). */
    async hasHighDynamicRange() {
      const colorSpace = await this._backing.getColorSpace();
      return colorSpace.primaries === "bt2020" || colorSpace.primaries === "smpte432" || colorSpace.transfer === "pq" || colorSpace.transfer === "hlg" || colorSpace.matrix === "bt2020-ncl";
    }
    /** Checks if this track may contain transparent samples with alpha data. */
    async canBeTransparent() {
      return this._backing.canBeTransparent();
    }
    /**
     * Returns the [decoder configuration](https://www.w3.org/TR/webcodecs/#video-decoder-config) for decoding the
     * track's packets using a [`VideoDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder). Returns
     * null if the track's codec is unknown.
     */
    async getDecoderConfig() {
      return this._backing.getDecoderConfig();
    }
    async getCodecParameterString() {
      const fromMetadata = await this._backing.getMetadataCodecParameterString?.();
      if (fromMetadata != null) {
        return fromMetadata;
      }
      const decoderConfig = await this._backing.getDecoderConfig();
      return decoderConfig?.codec ?? null;
    }
    async canDecode() {
      try {
        const decoderConfig = await this._backing.getDecoderConfig();
        if (!decoderConfig) {
          return false;
        }
        const codec = await this._backing.getCodec();
        assert(codec !== null);
        if (customVideoDecoders.some((x2) => x2.supports(codec, decoderConfig))) {
          return true;
        }
        if (typeof VideoDecoder === "undefined") {
          return false;
        }
        const support = await VideoDecoder.isConfigSupported(decoderConfig);
        return support.supported === true;
      } catch (error) {
        Logging._error("Error during decodability check:", error);
        return false;
      }
    }
    async determinePacketType(packet) {
      if (!(packet instanceof EncodedPacket)) {
        throw new TypeError("packet must be an EncodedPacket.");
      }
      if (packet.isMetadataOnly) {
        throw new TypeError("packet must not be metadata-only to determine its type.");
      }
      const codec = await this.getCodec();
      if (codec === null) {
        return null;
      }
      const decoderConfig = await this.getDecoderConfig();
      assert(decoderConfig);
      return determineVideoPacketType(codec, decoderConfig, packet.data);
    }
    /**
     * Computes frame rate metrics for this video track, i.e. estimates the video's frame rate. Frame rate is never
     * determined from file metadata (which is unreliable) but is always deduced directly from the actual frame
     * timestamps.
     */
    async computeFrameRateMetrics(options = {}) {
      if (!options || typeof options !== "object") {
        throw new TypeError("options must be an object.");
      }
      if (options.targetPacketCount !== void 0 && (!isNumber(options.targetPacketCount) || options.targetPacketCount < 0)) {
        throw new TypeError("options.targetPacketCount must be a non-negative number.");
      }
      const timeResolution = await this.getTimeResolution();
      const targetPacketCount = options.targetPacketCount ?? 256;
      const sink = new EncodedPacketSink(this);
      const timestamps = [];
      let maxTimestamp = -Infinity;
      let probedPacketCount = 0;
      for await (const packet of sink.packets(void 0, void 0, { metadataOnly: true })) {
        if (timestamps.length >= targetPacketCount && packet.timestamp >= maxTimestamp) {
          break;
        }
        timestamps.push(packet.timestamp);
        maxTimestamp = Math.max(maxTimestamp, packet.timestamp);
        probedPacketCount++;
      }
      const ticks = new Float64Array(timestamps.length);
      for (let i3 = 0; i3 < timestamps.length; i3++) {
        ticks[i3] = Math.round(timestamps[i3] * timeResolution);
      }
      ticks.sort();
      let n2 = 1;
      for (let i3 = 1; i3 < ticks.length; i3++) {
        if (ticks[i3] !== ticks[n2 - 1]) {
          ticks[n2++] = ticks[i3];
        }
      }
      if (n2 < 2) {
        return {
          underlyingFrameRate: null,
          bestGuessFrameRate: timeResolution,
          minFrameRate: timeResolution,
          maxFrameRate: timeResolution,
          averageFrameRate: timeResolution,
          medianFrameRate: timeResolution,
          frameRateIsConstant: true,
          probedPacketCount
        };
      }
      const activeTicks = ticks.subarray(0, n2);
      const underlyingFrameRate = findUnderlyingFrameRate(activeTicks, timeResolution);
      const unitRate = underlyingFrameRate ?? timeResolution;
      const ticksPerFrame = underlyingFrameRate !== null ? timeResolution / underlyingFrameRate : null;
      const histogram = /* @__PURE__ */ new Map();
      let minDifference = Infinity;
      let maxDifference = -Infinity;
      let totalDifference = 0;
      for (let i3 = 1; i3 < n2; i3++) {
        const tickDifference = activeTicks[i3] - activeTicks[i3 - 1];
        const difference = ticksPerFrame !== null ? Math.max(1, Math.round(tickDifference / ticksPerFrame)) : tickDifference;
        histogram.set(difference, (histogram.get(difference) ?? 0) + 1);
        minDifference = Math.min(minDifference, difference);
        maxDifference = Math.max(maxDifference, difference);
        totalDifference += difference;
      }
      const differenceCount = n2 - 1;
      const sortedDifferences = [...histogram.keys()].sort((a3, b2) => a3 - b2);
      const middleA = differenceCount - 1 >> 1;
      const middleB = differenceCount >> 1;
      let medianDifferenceA = 0;
      let medianDifferenceB = 0;
      let cumulativeCount = 0;
      for (const difference of sortedDifferences) {
        cumulativeCount += histogram.get(difference);
        if (medianDifferenceA === 0 && cumulativeCount > middleA) {
          medianDifferenceA = difference;
        }
        if (cumulativeCount > middleB) {
          medianDifferenceB = difference;
          break;
        }
      }
      const medianFrameRate = (unitRate / medianDifferenceA + unitRate / medianDifferenceB) / 2;
      return {
        underlyingFrameRate,
        bestGuessFrameRate: underlyingFrameRate !== null ? underlyingFrameRate : getBestGuessFrameRate(medianFrameRate),
        minFrameRate: unitRate / maxDifference,
        maxFrameRate: unitRate / minDifference,
        averageFrameRate: unitRate * differenceCount / totalDifference,
        medianFrameRate,
        frameRateIsConstant: underlyingFrameRate !== null && minDifference === 1 && maxDifference === 1,
        probedPacketCount
      };
    }
  };
  var InputAudioTrack = class extends InputTrack {
    /** @internal */
    constructor(input, backing) {
      super(input, backing);
    }
    get type() {
      return "audio";
    }
    /** The codec of the track's packets. */
    async getCodec() {
      return this._backing.getCodec();
    }
    /**
     * The codec of the track's packets.
     * @deprecated Use {@link InputAudioTrack.getCodec} instead.
     */
    get codec() {
      return requireSync(this._backing.getCodec(), "codec", "getCodec");
    }
    async hasOnlyKeyPackets() {
      return await this._backing.getHasOnlyKeyPackets?.() ?? true;
    }
    /** Returns the number of audio channels in the track. */
    async getNumberOfChannels() {
      return this._backing.getNumberOfChannels();
    }
    /**
     * The number of audio channels in the track.
     * @deprecated Use {@link InputAudioTrack.getNumberOfChannels} instead.
     */
    get numberOfChannels() {
      return requireSync(this._backing.getNumberOfChannels(), "numberOfChannels", "getNumberOfChannels");
    }
    /** Returns the track's audio sample rate in hertz. */
    async getSampleRate() {
      return this._backing.getSampleRate();
    }
    /**
     * The track's audio sample rate in hertz.
     * @deprecated Use {@link InputAudioTrack.getSampleRate} instead.
     */
    get sampleRate() {
      return requireSync(this._backing.getSampleRate(), "sampleRate", "getSampleRate");
    }
    /**
     * Returns the [decoder configuration](https://www.w3.org/TR/webcodecs/#audio-decoder-config) for decoding the
     * track's packets using an [`AudioDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder). Returns
     * null if the track's codec is unknown.
     */
    async getDecoderConfig() {
      return this._backing.getDecoderConfig();
    }
    async getCodecParameterString() {
      const fromMetadata = await this._backing.getMetadataCodecParameterString?.();
      if (fromMetadata != null) {
        return fromMetadata;
      }
      const decoderConfig = await this._backing.getDecoderConfig();
      return decoderConfig?.codec ?? null;
    }
    async canDecode() {
      try {
        const decoderConfig = await this._backing.getDecoderConfig();
        if (!decoderConfig) {
          return false;
        }
        const codec = await this._backing.getCodec();
        assert(codec !== null);
        if (customAudioDecoders.some((x2) => x2.supports(codec, decoderConfig))) {
          return true;
        }
        if (PCM_AUDIO_CODECS.includes(decoderConfig.codec)) {
          return true;
        } else {
          if (typeof AudioDecoder === "undefined") {
            return false;
          }
          const support = await AudioDecoder.isConfigSupported(decoderConfig);
          return support.supported === true;
        }
      } catch (error) {
        Logging._error("Error during decodability check:", error);
        return false;
      }
    }
    async determinePacketType(packet) {
      if (!(packet instanceof EncodedPacket)) {
        throw new TypeError("packet must be an EncodedPacket.");
      }
      if (await this.getCodec() === null) {
        return null;
      }
      return "key";
    }
  };
  var desc = (value) => {
    return -(value ?? -Infinity);
  };
  var prefer = (value) => {
    return -value;
  };
  var toValidatedInputTrackQuery = (query) => {
    if (typeof query !== "object" || !query) {
      throw new TypeError("query must be an object.");
    }
    if (query.filter !== void 0 && typeof query.filter !== "function") {
      throw new TypeError("query.filter, when provided, must be a function.");
    }
    if (query.sortBy !== void 0 && typeof query.sortBy !== "function") {
      throw new TypeError("query.sortBy, when provided, must be a function.");
    }
    return {
      filter: query.filter ? (track) => {
        const handle = (bool) => {
          if (typeof bool !== "boolean") {
            throw new TypeError("query.filter must return or resolve to a boolean.");
          }
          return bool;
        };
        const result = query.filter(track);
        if (isThenable(result)) {
          return result.then(handle);
        } else {
          return handle(result);
        }
      } : void 0,
      sortBy: query.sortBy ? (track) => {
        const handle = (value) => {
          if (typeof value !== "number" && (!Array.isArray(value) || !value.every((x2) => typeof x2 === "number"))) {
            throw new TypeError("query.sortBy must return or resolve to a number or an array of numbers.");
          }
          return value;
        };
        const result = query.sortBy(track);
        if (isThenable(result)) {
          return result.then(handle);
        } else {
          return handle(result);
        }
      } : void 0
    };
  };
  var mergeInputTrackQueries = (queryA, queryB) => {
    return {
      filter: queryA?.filter || queryB?.filter ? (track) => {
        const resultA = queryA?.filter?.(track) ?? true;
        const handleResultA = (resultA2) => {
          if (resultA2 === false) {
            return false;
          }
          return queryB?.filter?.(track) ?? true;
        };
        if (isThenable(resultA)) {
          return resultA.then(handleResultA);
        } else {
          return handleResultA(resultA);
        }
      } : void 0,
      sortBy: queryA?.sortBy || queryB?.sortBy ? (track) => {
        const resultA = queryA?.sortBy?.(track) ?? [];
        const resultB = queryB?.sortBy?.(track) ?? [];
        const join = (resultA2, resultB2) => {
          return [
            ...Array.isArray(resultA2) ? resultA2 : [resultA2],
            ...Array.isArray(resultB2) ? resultB2 : [resultB2]
          ];
        };
        if (isThenable(resultA) || isThenable(resultB)) {
          return Promise.all([resultA, resultB]).then(([resultA2, resultB2]) => {
            return join(resultA2, resultB2);
          });
        } else {
          return join(resultA, resultB);
        }
      } : void 0
    };
  };
  var queryInputTracks = async (tracks, query) => {
    let matched = tracks;
    if (query?.filter) {
      const filterMatches = tracks.map((t3) => query.filter(t3));
      const hasAsyncFilter = filterMatches.some((x2) => isThenable(x2));
      if (hasAsyncFilter) {
        const resolvedFilterMatches = await Promise.all(filterMatches);
        matched = tracks.filter((_2, i3) => resolvedFilterMatches[i3]);
      } else {
        matched = tracks.filter((_2, i3) => filterMatches[i3]);
      }
    }
    if (!query?.sortBy) {
      return matched;
    }
    const sortValues = matched.map((t3) => query.sortBy(t3));
    const hasAsyncSort = sortValues.some((x2) => isThenable(x2));
    const resolvedSortValues = hasAsyncSort ? await Promise.all(sortValues) : sortValues;
    return matched.map((track, i3) => ({ track, sortValue: resolvedSortValues[i3] })).sort((a3, b2) => {
      const aValues = Array.isArray(a3.sortValue) ? a3.sortValue : [a3.sortValue];
      const bValues = Array.isArray(b2.sortValue) ? b2.sortValue : [b2.sortValue];
      const maxLength = Math.max(aValues.length, bValues.length);
      for (let i3 = 0; i3 < maxLength; i3++) {
        const aValue = aValues[i3] ?? 0;
        const bValue = bValues[i3] ?? 0;
        if (aValue === bValue) {
          continue;
        }
        return aValue - bValue;
      }
      return 0;
    }).map((x2) => x2.track);
  };
  var findUnderlyingFrameRate = (ticks, resolution) => {
    const MAX_DENOMINATOR = 1e6;
    const MIN_INLIER_RATIO = 0.98;
    const DELTA_TOLERANCE = 1 + 1e-9;
    const MAX_EFFECTIVE_FRAME_SPAN = 1e3;
    const KNOWN_FRAME_RATES = [
      12,
      15,
      20,
      24e3 / 1001,
      24,
      25,
      3e4 / 1001,
      30,
      48,
      50,
      6e4 / 1001,
      60,
      100,
      12e4 / 1001,
      120,
      144,
      240
    ];
    if (ticks.length < 2) {
      return null;
    }
    const gaps = new Float64Array(ticks.length - 1);
    for (let i3 = 1; i3 < ticks.length; i3++) {
      const gap = ticks[i3] - ticks[i3 - 1];
      if (!(gap > 0)) {
        return null;
      }
      gaps[i3 - 1] = gap;
    }
    const sortedGaps = gaps.slice();
    sortedGaps.sort();
    let period = sortedGaps[Math.floor(sortedGaps.length * 0.05)];
    for (let iteration = 0; iteration < 6; iteration++) {
      let totalTicks2 = 0;
      let totalFrames2 = 0;
      for (const gap of gaps) {
        const multiple = Math.max(1, Math.round(gap / period));
        if (Math.abs(gap - multiple * period) >= DELTA_TOLERANCE) {
          continue;
        }
        totalTicks2 += gap;
        totalFrames2 += multiple;
      }
      if (totalFrames2 === 0) {
        return null;
      }
      const refinedPeriod = totalTicks2 / totalFrames2;
      if (Math.abs(refinedPeriod - period) <= 1e-12 * Math.max(1, period)) {
        period = refinedPeriod;
        break;
      }
      period = refinedPeriod;
    }
    let inlierCount = 0;
    let totalTicks = 0;
    let totalFrames = 0;
    for (const gap of gaps) {
      const multiple = Math.max(1, Math.round(gap / period));
      if (Math.abs(gap - multiple * period) >= DELTA_TOLERANCE) {
        continue;
      }
      inlierCount++;
      totalTicks += gap;
      totalFrames += multiple;
    }
    if (inlierCount / gaps.length < MIN_INLIER_RATIO) {
      return null;
    }
    period = totalTicks / totalFrames;
    const uncertainty = 1 / Math.min(totalFrames, MAX_EFFECTIVE_FRAME_SPAN);
    const periodLo = Math.max(Number.EPSILON, period - uncertainty);
    const periodHi = period + uncertainty;
    const fpsLo = resolution / periodHi;
    const fpsHi = resolution / periodLo;
    const fittedFps = resolution / period;
    let fps = null;
    let bestKnownError = Infinity;
    for (const candidate of KNOWN_FRAME_RATES) {
      if (candidate < fpsLo || candidate > fpsHi) {
        continue;
      }
      const error = Math.abs(candidate / fittedFps - 1);
      if (error < bestKnownError) {
        fps = candidate;
        bestKnownError = error;
      }
    }
    if (fps === null) {
      const periodFraction = simplestFractionBetween(periodLo, periodHi, MAX_DENOMINATOR);
      const fpsFraction = simplestFractionBetween(fpsLo, fpsHi, MAX_DENOMINATOR);
      if (fpsFraction && (!periodFraction || fpsFraction.den < periodFraction.den || fpsFraction.den === periodFraction.den && fpsFraction.num <= periodFraction.num)) {
        fps = fpsFraction.num / fpsFraction.den;
      } else if (periodFraction) {
        fps = resolution * periodFraction.den / periodFraction.num;
      } else {
        return null;
      }
    }
    const finalPeriod = resolution / fps;
    let finalInlierCount = 0;
    for (const gap of gaps) {
      const multiple = Math.max(1, Math.round(gap / finalPeriod));
      if (Math.abs(gap - multiple * finalPeriod) < DELTA_TOLERANCE) {
        finalInlierCount++;
      }
    }
    if (finalInlierCount / gaps.length < MIN_INLIER_RATIO) {
      return null;
    }
    return fps;
  };
  var simplestFractionBetween = (lo, hi, maxDenominator) => {
    for (let den = 1; den <= maxDenominator; den++) {
      const num = Math.floor(lo * den) + 1;
      if (num / den < hi) {
        return simplifyRational({ num, den });
      }
    }
    return null;
  };
  var getBestGuessFrameRate = (frameRate) => {
    const SPECIAL_FRAME_RATES = [
      24 / 1.001,
      30 / 1.001,
      60 / 1.001,
      120 / 1.001
    ];
    const COMMON_FRAME_RATES = [
      12,
      15,
      20,
      24,
      25,
      30,
      48,
      50,
      60,
      100,
      120,
      144,
      240
    ];
    const SPECIAL_TOLERANCE = 5e-4;
    const COMMON_TOLERANCE = 0.025;
    for (const candidate of SPECIAL_FRAME_RATES) {
      if (Math.abs(candidate / frameRate - 1) <= SPECIAL_TOLERANCE) {
        return candidate;
      }
    }
    let best = frameRate;
    let bestError = Infinity;
    for (const candidate of COMMON_FRAME_RATES) {
      const error = Math.abs(candidate / frameRate - 1);
      if (error <= COMMON_TOLERANCE && error < bestError) {
        best = candidate;
        bestError = error;
      }
    }
    return best;
  };

  // node_modules/mediabunny/dist/modules/src/input.js
  polyfillSymbolDispose();
  var DEFAULT_SOURCE_CACHE_GROUP = 1;
  var Input = class _Input extends EventEmitter {
    /** True if the input has been disposed. */
    get disposed() {
      return this._disposed;
    }
    /**
     * Creates a new input file from the specified options. No reading operations will be performed until methods are
     * called on this instance.
     */
    constructor(options) {
      super();
      this._demuxerPromise = null;
      this._format = null;
      this._trackBackingsCache = null;
      this._backingToTrack = /* @__PURE__ */ new Map();
      this._disposed = false;
      this._nextSourceCacheAge = 0;
      this._sourceRefs = [];
      this._sourceCache = [];
      this._sourceCachePromises = [];
      this._onFormatDetermined = null;
      if (!options || typeof options !== "object") {
        throw new TypeError("options must be an object.");
      }
      if (!Array.isArray(options.formats) || options.formats.some((x2) => !(x2 instanceof InputFormat))) {
        throw new TypeError("options.formats must be an array of InputFormat.");
      }
      if (!(options.source instanceof Source || options.source instanceof SourceRef)) {
        throw new TypeError("options.source must be a Source or SourceRef.");
      }
      if (options.source instanceof Source && options.source._disposed) {
        throw new TypeError("options.source must not be a disposed Source.");
      }
      if (options.initInput !== void 0 && !(options.initInput instanceof _Input)) {
        throw new TypeError("options.initInput, when provided, must be an Input.");
      }
      if (options.formatOptions !== void 0) {
        validateInputFormatOptions(options.formatOptions, "formatOptions");
      }
      this._formats = options.formats;
      this._initInput = options.initInput ?? null;
      this._formatOptions = options.formatOptions ?? {};
      if (options.source instanceof Source) {
        this._rootRef = options.source.ref();
      } else {
        this._rootRef = options.source;
      }
      this._sourceRefs.push(this._rootRef);
    }
    /** @internal */
    get _rootSource() {
      return this._rootRef.source;
    }
    /** @internal */
    async _getSourceUncached(request2) {
      assert(this._rootSource instanceof PathedSource);
      const ref = await this._rootSource._resolveRequest(request2);
      this._emit("source", { source: ref.source, request: request2, isRoot: request2.isRoot });
      return ref;
    }
    /** @internal */
    _getSourceCached(request2, cacheGroup = DEFAULT_SOURCE_CACHE_GROUP) {
      const cachedEntry = this._sourceCache.find((x2) => x2.cacheGroup === cacheGroup && sourceRequestsAreEqual(x2.request, request2));
      if (cachedEntry) {
        cachedEntry.age++;
        return Promise.resolve(cachedEntry.sourceRef.source.ref());
      }
      const cachedPromiseEntry = this._sourceCachePromises.find((x2) => x2.cacheGroup === cacheGroup && sourceRequestsAreEqual(x2.request, request2));
      if (cachedPromiseEntry) {
        return cachedPromiseEntry.promise.then((x2) => x2.sourceRef.source.ref());
      }
      const promise = (async () => {
        const sourceRef = await this._getSourceUncached(request2);
        if (this._disposed) {
          sourceRef.free();
          throw new InputDisposedError();
        }
        const MAX_SOURCE_CACHE_SIZE = 4;
        const count = arrayCount(this._sourceCache, (x2) => x2.cacheGroup === cacheGroup && x2.sourceRef.source._refCount === 1);
        if (count >= MAX_SOURCE_CACHE_SIZE) {
          const minAgeIndex = arrayArgmin(this._sourceCache, (x2) => x2.cacheGroup === cacheGroup && x2.sourceRef.source._refCount === 1 ? x2.age : Infinity);
          assert(minAgeIndex !== -1);
          const entry = this._sourceCache[minAgeIndex];
          this._sourceCache.splice(minAgeIndex, 1);
          entry.sourceRef.free();
          removeItem(this._sourceRefs, entry.sourceRef);
        }
        this._sourceRefs.push(sourceRef);
        const promiseIndex = this._sourceCachePromises.findIndex((x2) => x2.request === request2);
        assert(promiseIndex !== -1);
        this._sourceCachePromises.splice(promiseIndex, 1);
        const cacheEntry = {
          request: request2,
          sourceRef,
          age: this._nextSourceCacheAge++,
          cacheGroup
        };
        return cacheEntry;
      })();
      this._sourceCachePromises.push({
        request: request2,
        cacheGroup,
        promise
      });
      return promise.then((entry) => {
        const ref = entry.sourceRef.source.ref();
        this._sourceCache.push(entry);
        return ref;
      });
    }
    /** @internal */
    _getDemuxer() {
      return this._demuxerPromise ??= (async () => {
        this._reader = new Reader(this._rootSource);
        this._emit("source", { source: this._rootSource, request: null, isRoot: true });
        for (const format of this._formats) {
          const canRead = await format._canReadInput(this);
          if (canRead) {
            this._format = format;
            this._onFormatDetermined?.(format);
            return format._createDemuxer(this);
          }
        }
        throw new UnsupportedInputFormatError();
      })();
    }
    /**
     * Returns the source from which this input file reads data for the root path.
     */
    get source() {
      return this._rootSource;
    }
    /**
     * Returns the format of the input file. You can compare this result directly to the {@link InputFormat} singletons
     * or use `instanceof` checks for subset-aware logic (for example, `format instanceof MatroskaInputFormat` is true
     * for both MKV and WebM).
     */
    async getFormat() {
      await this._getDemuxer();
      assert(this._format);
      return this._format;
    }
    /** Returns `true` if the format of the input file is known and the file can be read, `false` otherwise. */
    async canRead() {
      try {
        await this._getDemuxer();
        return true;
      } catch (error) {
        if (error instanceof UnsupportedInputFormatError) {
          return false;
        }
        throw error;
      }
    }
    /**
     * Returns the timestamp at which the input file starts. More precisely, returns the smallest starting timestamp
     * among all tracks.
     *
     * Optionally, you can pass in the list of tracks for which you want to compute the starting timestamp.
     *
     * Note that this method is potentially expensive for inputs with many tracks (such as HLS manifests), since it
     * probes every track.
     */
    async getFirstTimestamp(tracks) {
      tracks ??= await this.getTracks();
      const filtered = tracks.filter((x2) => x2 !== null);
      if (filtered.length === 0) {
        return 0;
      }
      const firstPackets = await Promise.all(filtered.map((x2) => x2._backing.getFirstPacket({ metadataOnly: true })));
      const result = Math.min(...firstPackets.map((x2) => x2?.timestamp ?? Infinity));
      return result === Infinity ? 0 : result;
    }
    /**
     * Computes the duration of the input file, in seconds. More precisely, returns the largest end timestamp among
     * all tracks.
     *
     * Optionally, you can pass in the list of tracks for which you want to compute the duration.
     *
     * This method can be potentially expensive depending on the underlying file format, because it returns the most
     * accurate duration possible and must check all tracks. Use {@link Input.getDurationFromMetadata} for a faster but
     * less accurate estimate of duration.
     *
     * By default, when any track in the underlying media is live, this method will only resolve once the live stream
     * ends. If you want to query the current duration of the media, set {@link PacketRetrievalOptions.skipLiveWait}
     * to `true` in the options.
     */
    async computeDuration(tracks, options) {
      tracks ??= await this.getTracks();
      const filtered = tracks.filter((x2) => x2 !== null);
      if (filtered.length === 0) {
        return 0;
      }
      const tracksDurations = await Promise.all(filtered.map((x2) => x2.computeDuration(options)));
      return Math.max(...tracksDurations);
    }
    /**
     * Gets the duration (end timestamp) in seconds of the input file from metadata stored in the file. This value may
     * be approximate or diverge from the actual, precise duration returned by `.computeDuration()`, but compared to
     * that method, this method is cheaper. When the duration cannot be determined from the file metadata, `null`
     * is returned.
     *
     * Optionally, you can pass in the list of tracks for which you want to get the duration from metadata.
     *
     * By default, when the underlying media is live, this method will only resolve once the live stream
     * ends. If you want to query the current duration of the media, set
     * {@link DurationMetadataRequestOptions.skipLiveWait} to `true` in the options.
     */
    async getDurationFromMetadata(tracks, options) {
      tracks ??= await this.getTracks();
      const filtered = tracks.filter((x2) => x2 !== null);
      const tracksDurations = await Promise.all(filtered.map((x2) => x2.getDurationFromMetadata(options)));
      const nonNullDurations = tracksDurations.filter((x2) => x2 !== null);
      if (nonNullDurations.length === 0) {
        return null;
      }
      return Math.max(...nonNullDurations);
    }
    /**
     * Returns the list of all tracks of this input file in the order in which they appear in the file. An optional
     * query can be provided.
     */
    async getTracks(query) {
      query &&= toValidatedInputTrackQuery(query);
      const backings = await this._getTrackBackings();
      const tracks = backings.map((backing) => this._wrapBackingAsTrack(backing));
      return queryInputTracks(tracks, query);
    }
    /** Returns the list of all video tracks of this input file. An optional query can be provided. */
    async getVideoTracks(query) {
      query &&= toValidatedInputTrackQuery(query);
      const tracks = await this.getTracks();
      const videoTracks = tracks.filter((x2) => x2.isVideoTrack());
      return queryInputTracks(videoTracks, query);
    }
    /** Returns the list of all audio tracks of this input file. An optional query can be provided. */
    async getAudioTracks(query) {
      query &&= toValidatedInputTrackQuery(query);
      const tracks = await this.getTracks();
      const audioTracks = tracks.filter((x2) => x2.isAudioTrack());
      return queryInputTracks(audioTracks, query);
    }
    /**
     * Returns the primary video track of this input file, or null if there are no video tracks.
     *
     * Multiple factors determine which track is considered primary, including its position in the file, disposition,
     * bitrate (higher bitrate is preferred), and if it can be paired with an audio track.
     */
    async getPrimaryVideoTrack(query) {
      query &&= toValidatedInputTrackQuery(query);
      const merged = mergeInputTrackQueries(query, {
        sortBy: async (t3) => [
          prefer((await t3.getDisposition()).default),
          prefer(await t3.hasPairableAudioTrack()),
          prefer(!await t3.hasOnlyKeyPackets()),
          desc(await t3.getBitrate())
        ]
      });
      const sorted = await this.getVideoTracks(merged);
      return sorted[0] ?? null;
    }
    /**
     * Returns the primary audio track of this input file, or null if there are no audio tracks.
     *
     * Multiple factors determine which track is considered primary, including its position in the file, disposition,
     * bitrate (higher bitrate is preferred), and if it can be paired with the primary video track.
     */
    async getPrimaryAudioTrack(query) {
      query &&= toValidatedInputTrackQuery(query);
      const primaryVideoTrack = await this.getPrimaryVideoTrack();
      const merged = mergeInputTrackQueries(query, {
        sortBy: async (t3) => [
          prefer(!primaryVideoTrack || t3.canBePairedWith(primaryVideoTrack)),
          prefer((await t3.getDisposition()).default),
          desc(await t3.getBitrate())
        ]
      });
      const sorted = await this.getAudioTracks(merged);
      return sorted[0] ?? null;
    }
    /** @internal */
    async _getTrackBackings() {
      const demuxer = await this._getDemuxer();
      return this._trackBackingsCache ??= await demuxer.getTrackBackings();
    }
    /** @internal */
    _wrapBackingAsTrack(backing) {
      const existing = this._backingToTrack.get(backing);
      if (existing) {
        return existing;
      }
      const type = backing.getType();
      const track = type === "video" ? new InputVideoTrack(this, backing) : new InputAudioTrack(this, backing);
      this._backingToTrack.set(backing, track);
      return track;
    }
    /** Returns the full MIME type of this input file, including track codecs. */
    async getMimeType() {
      const demuxer = await this._getDemuxer();
      return demuxer.getMimeType();
    }
    /**
     * Returns descriptive metadata tags about the media file, such as title, author, date, cover art, or other
     * attached files.
     */
    async getMetadataTags() {
      const demuxer = await this._getDemuxer();
      return demuxer.getMetadataTags();
    }
    /**
     * Disposes this input and frees connected resources. When an input is disposed, ongoing read operations will be
     * canceled, all future read operations will fail, any open decoders will be closed, and all ongoing media sink
     * operations will be canceled. Disallowed and canceled operations will throw an {@link InputDisposedError}.
     *
     * You are expected not to use an input after disposing it. While some operations may still work, it is not
     * specified and may change in any future update.
     */
    dispose() {
      if (this._disposed) {
        return;
      }
      this._disposed = true;
      for (const ref of this._sourceRefs) {
        ref.free();
      }
      this._sourceRefs.length = 0;
      if (this._demuxerPromise) {
        void this._demuxerPromise.then((demuxer) => demuxer.dispose()).catch(() => {
        });
      }
    }
    /**
     * Calls `.dispose()` on the input, implementing the `Disposable` interface for use with
     * JavaScript Explicit Resource Management features.
     */
    [Symbol.dispose]() {
      this.dispose();
    }
  };
  var UnsupportedInputFormatError = class extends Error {
    /** Creates a new {@link UnsupportedInputFormatError}. */
    constructor(message = "Input has an unsupported or unrecognizable format.") {
      super(message);
      this.name = "UnsupportedInputFormatError";
    }
  };
  var InputDisposedError = class extends Error {
    /** Creates a new {@link InputDisposedError}. */
    constructor(message = "Input has been disposed.") {
      super(message);
      this.name = "InputDisposedError";
    }
  };

  // node_modules/mediabunny/dist/modules/src/reader.js
  var Reader = class {
    constructor(source) {
      this.source = source;
    }
    get fileSize() {
      const size = this.source._getFileSize();
      if (size === void 0) {
        throw new Error("Reading file size too early; read required first.");
      }
      return size;
    }
    get fileSizeNonStrict() {
      return this.source._getFileSize() ?? null;
    }
    requestSlice(start, length) {
      if (this.source._disposed) {
        throw new InputDisposedError();
      }
      if (start < 0) {
        return null;
      }
      if (this.fileSizeNonStrict !== null && start + length > this.fileSizeNonStrict) {
        return null;
      }
      if (length === 0) {
        const buffer = new Uint8Array(0);
        return new FileSlice(buffer, toDataView(buffer), 0, start, start);
      }
      const end = start + length;
      const result = this.source._read(start, end, DEFAULT_MIN_READ_POSITION, DEFAULT_MAX_READ_POSITION);
      if (isThenable(result)) {
        return result.then((x2) => {
          if (!x2) {
            return null;
          }
          return new FileSlice(x2.bytes, x2.view, x2.offset, start, end);
        });
      } else {
        if (!result) {
          return null;
        }
        return new FileSlice(result.bytes, result.view, result.offset, start, end);
      }
    }
    requestSliceRange(start, minLength, maxLength) {
      if (this.source._disposed) {
        throw new InputDisposedError();
      }
      if (start < 0) {
        return null;
      }
      if (this.fileSizeNonStrict !== null) {
        return this.requestSlice(start, clamp5(this.fileSizeNonStrict - start, minLength, maxLength));
      } else {
        const promisedAttempt = this.requestSlice(start, maxLength);
        const handleAttempt = (attempt) => {
          if (attempt) {
            return attempt;
          }
          assert(this.fileSizeNonStrict !== null);
          return this.requestSlice(start, clamp5(this.fileSizeNonStrict - start, minLength, maxLength));
        };
        if (isThenable(promisedAttempt)) {
          return promisedAttempt.then(handleAttempt);
        } else {
          return handleAttempt(promisedAttempt);
        }
      }
    }
    requestEntireFile() {
      if (this.fileSizeNonStrict !== null) {
        return this.requestSlice(0, this.fileSizeNonStrict);
      }
      const CHUNK_SIZE = 1024;
      return (async () => {
        const chunks = [];
        let currentSize = 0;
        while (true) {
          if (chunks.length === 1 && this.fileSizeNonStrict !== null) {
            return this.requestSlice(0, this.fileSizeNonStrict);
          }
          let slice = this.requestSliceRange(currentSize, 0, CHUNK_SIZE);
          if (isThenable(slice))
            slice = await slice;
          if (!slice || slice.length === 0) {
            break;
          }
          const chunk = readBytes(slice, slice.length);
          chunks.push(chunk);
          currentSize += slice.length;
        }
        const joined = new Uint8Array(currentSize);
        let offset = 0;
        for (const chunk of chunks) {
          joined.set(chunk, offset);
          offset += chunk.length;
        }
        return new FileSlice(joined, toDataView(joined), 0, 0, currentSize);
      })();
    }
  };
  var FileSlice = class _FileSlice {
    constructor(bytes, view, offset, start, end) {
      this.bytes = bytes;
      this.view = view;
      this.offset = offset;
      this.start = start;
      this.end = end;
      this.bufferPos = start - offset;
    }
    static tempFromBytes(bytes) {
      return new _FileSlice(bytes, toDataView(bytes), 0, 0, bytes.length);
    }
    get length() {
      return this.end - this.start;
    }
    get filePos() {
      return this.offset + this.bufferPos;
    }
    set filePos(value) {
      this.bufferPos = value - this.offset;
    }
    /** The number of bytes left from the current pos to the end of the slice. */
    get remainingLength() {
      return Math.max(this.end - this.filePos, 0);
    }
    skip(byteCount) {
      this.bufferPos += byteCount;
    }
    /** Creates a new subslice of this slice whose byte range must be contained within this slice. */
    slice(filePos, length = this.end - filePos) {
      if (filePos < this.start || filePos + length > this.end) {
        throw new RangeError("Slicing outside of original slice.");
      }
      return new _FileSlice(this.bytes, this.view, this.offset, filePos, filePos + length);
    }
  };
  var checkIsInRange = (slice, bytesToRead) => {
    if (slice.filePos < slice.start || slice.filePos + bytesToRead > slice.end) {
      throw new RangeError(`Tried reading [${slice.filePos}, ${slice.filePos + bytesToRead}), but slice is [${slice.start}, ${slice.end}). This is likely an internal error, please report it alongside the file that caused it.`);
    }
  };
  var readBytes = (slice, length) => {
    checkIsInRange(slice, length);
    const bytes = slice.bytes.subarray(slice.bufferPos, slice.bufferPos + length);
    slice.bufferPos += length;
    return bytes;
  };
  var readU8 = (slice) => {
    checkIsInRange(slice, 1);
    return slice.view.getUint8(slice.bufferPos++);
  };
  var readU16Be = (slice) => {
    checkIsInRange(slice, 2);
    const value = slice.view.getUint16(slice.bufferPos, false);
    slice.bufferPos += 2;
    return value;
  };
  var readU24Be = (slice) => {
    checkIsInRange(slice, 3);
    const value = getUint24(slice.view, slice.bufferPos, false);
    slice.bufferPos += 3;
    return value;
  };
  var readI16Be = (slice) => {
    checkIsInRange(slice, 2);
    const value = slice.view.getInt16(slice.bufferPos, false);
    slice.bufferPos += 2;
    return value;
  };
  var readU32Be = (slice) => {
    checkIsInRange(slice, 4);
    const value = slice.view.getUint32(slice.bufferPos, false);
    slice.bufferPos += 4;
    return value;
  };
  var readI32Be = (slice) => {
    checkIsInRange(slice, 4);
    const value = slice.view.getInt32(slice.bufferPos, false);
    slice.bufferPos += 4;
    return value;
  };
  var readU64Be = (slice) => {
    const high = readU32Be(slice);
    const low = readU32Be(slice);
    return high * 4294967296 + low;
  };
  var readI64Be = (slice) => {
    const high = readI32Be(slice);
    const low = readU32Be(slice);
    return high * 4294967296 + low;
  };
  var readF64Be = (slice) => {
    checkIsInRange(slice, 8);
    const value = slice.view.getFloat64(slice.bufferPos, false);
    slice.bufferPos += 8;
    return value;
  };
  var readAscii = (slice, length) => {
    checkIsInRange(slice, length);
    let str = "";
    for (let i3 = 0; i3 < length; i3++) {
      str += String.fromCharCode(slice.bytes[slice.bufferPos++]);
    }
    return str;
  };

  // node_modules/mediabunny/dist/modules/src/index.js
  var MEDIABUNNY_LOADED_SYMBOL = Symbol.for("mediabunny loaded");
  if (globalThis[MEDIABUNNY_LOADED_SYMBOL]) {
    Logging._error("[WARNING]\nMediabunny was loaded twice. This will likely cause Mediabunny not to work correctly. Check if multiple dependencies are importing different versions of Mediabunny, or if something is being bundled incorrectly.");
  }
  globalThis[MEDIABUNNY_LOADED_SYMBOL] = true;

  // editor/frames.js
  async function openFrames(url = "/media/raw.mp4") {
    const input = new Input({ source: new UrlSource(url, {
      requestInit: { credentials: "same-origin" },
      maxCacheSize: 16 * 1024 * 1024,
      getRetryDelay: () => null
    }), formats: [MP4] });
    try {
      let stopAhead = function() {
        generation++;
        ahead?.return().catch(() => {
        });
        ahead = null;
        aheadStart = aheadEnd = -Infinity;
      };
      const track = await input.getPrimaryVideoTrack();
      if (!track || !await track.canDecode()) throw new Error("Recording has no decodable video track");
      const sourceSize2 = { width: await track.getDisplayWidth(), height: await track.getDisplayHeight() };
      const duration = await track.computeDuration();
      const { averagePacketRate } = await track.computePacketStats();
      const sink = new CanvasSink(track, { poolSize: 0, width: Math.min(sourceSize2.width, 1600) });
      const cache = /* @__PURE__ */ new Map();
      let closed = false, generation = 0, ahead = null, aheadStart = -Infinity, aheadEnd = -Infinity;
      const remember = (frame) => {
        if (!frame || closed) return;
        cache.delete(frame.timestamp);
        cache.set(frame.timestamp, frame);
        while (cache.size > 40) cache.delete(cache.keys().next().value);
      };
      const lookup = (t3) => {
        const frame = [...cache.values()].find((f3) => f3.timestamp <= t3 && t3 < f3.timestamp + f3.duration);
        if (frame) {
          cache.delete(frame.timestamp);
          cache.set(frame.timestamp, frame);
        }
        return frame;
      };
      return {
        sourceSize: sourceSize2,
        duration,
        averageFrameRate: averagePacketRate,
        async getFrame(sourceT) {
          if (closed) throw new Error("Frame provider is closed");
          const t3 = Math.max(0, Math.min(sourceT, duration));
          const cached = lookup(t3);
          if (cached) return cached.canvas;
          stopAhead();
          const frame = await sink.getCanvas(t3);
          remember(frame);
          return frame?.canvas ?? null;
        },
        prefetch(sourceT, playbackRate = 1) {
          const horizon = 0.75 * Math.max(0.25, Math.abs(playbackRate));
          if (closed || ahead) return;
          const continuing = sourceT >= aheadStart && sourceT <= aheadEnd;
          if (continuing && sourceT < aheadEnd - 0.2) return;
          const start = continuing ? aheadEnd : sourceT;
          aheadStart = sourceT;
          aheadEnd = Math.min(duration, start + horizon);
          const token = generation;
          const iterator = sink.canvases(start, aheadEnd);
          ahead = iterator;
          (async () => {
            try {
              for await (const frame of iterator) {
                if (closed || token !== generation) break;
                remember(frame);
              }
            } catch {
            } finally {
              if (ahead === iterator) ahead = null;
            }
          })();
        },
        pause: stopAhead,
        close() {
          closed = true;
          stopAhead();
          cache.clear();
          input.dispose();
        }
      };
    } catch (error) {
      input.dispose();
      throw error;
    }
  }

  // scripts/lib/compose/custom-cursor.mjs
  var imageAssetUrl = (image) => `assets/${image.split("/").map(encodeURIComponent).join("/")}`;
  var cursorImageWarning = (image) => `Cannot load custom cursor image: ${image}; using vector arrow`;
  function customCursorSpec(cursor, shape) {
    return cursor.custom?.[shape] ?? cursor.custom?.arrow;
  }
  async function loadCustomCursorImages(plan, urls, load) {
    const loaded = /* @__PURE__ */ new Map();
    if (plan.cursor.style !== "custom") return loaded;
    const specs = ["arrow", "hand", "text"].map((shape) => plan.cursor.custom?.[shape]).filter(Boolean);
    await Promise.all([...new Set(specs.map((spec) => spec.image))].map(async (image) => {
      try {
        loaded.set(image, await load(urls?.[image] ?? imageAssetUrl(image)));
      } catch {
        const warning = cursorImageWarning(image);
        if (!plan.warnings.includes(warning)) plan.warnings.push(warning);
      }
    }));
    return loaded;
  }

  // scripts/lib/compose/draw.js
  var fontLoads = /* @__PURE__ */ new Map();
  async function loadFonts(fonts) {
    const key = JSON.stringify(fonts);
    if (!fontLoads.has(key)) fontLoads.set(key, Promise.all([
      ["regular", "400"],
      ["semibold", "600"]
    ].map(async ([name, weight]) => {
      const face = new FontFace("Inter", `url(${JSON.stringify(fonts[name])})`, { weight });
      document.fonts.add(await face.load());
    })));
    await fontLoads.get(key);
  }
  var images = /* @__PURE__ */ new Map();
  var cursorImages = /* @__PURE__ */ new Map();
  var loadCursorImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => img.naturalWidth && img.naturalHeight ? resolve(img) : reject(new Error("Empty cursor image"));
    img.onerror = reject;
    img.src = new URL(url, location.href).href;
  });
  async function loadImages(plan, { assetBase = "assets/" } = {}) {
    const specs = [
      plan.frame.background,
      plan.cards.title.background,
      plan.cards.outro.background,
      plan.cards.title.logo,
      plan.cards.outro.logo
    ];
    await Promise.all(specs.filter((s3) => s3?.image).map(async ({ image }) => {
      const url = new URL(`${assetBase}${image.split("/").map(encodeURIComponent).join("/")}`, location.href).href;
      if (!images.has(image)) images.set(image, new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Cannot load image: ${image}`));
        img.src = url;
      }));
      const loaded = await images.get(image);
      images.set(image, loaded);
    }));
  }
  async function loadAssets(plan, options = {}) {
    await loadImages(plan, options);
    const urls = options.cursorImages ?? (options.assetBase ? Object.fromEntries(
      Object.values(plan.cursor.custom ?? {}).filter((s3) => s3?.image).map((s3) => [
        s3.image,
        `${options.assetBase}${s3.image.split("/").map(encodeURIComponent).join("/")}`
      ])
    ) : void 0);
    cursorImages = await loadCustomCursorImages(plan, urls, loadCursorImage);
    return { images, cursorImages };
  }
  function background2(ctx, spec, width, height, fallback) {
    if (spec.type === "theme") spec = fallback;
    if (spec.type === "image") {
      const img = images.get(spec.image), scale = Math.max(width / img.width, height / img.height);
      ctx.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) / 2, img.width * scale, img.height * scale);
      return;
    }
    if (spec.type === "solid") {
      ctx.fillStyle = spec.colors[0];
      ctx.fillRect(0, 0, width, height);
      return;
    }
    const angle = (spec.angle ?? 135) * Math.PI / 180;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const length = Math.abs(width * dx) + Math.abs(height * dy);
    const gradient = ctx.createLinearGradient(
      width / 2 - dx * length / 2,
      height / 2 - dy * length / 2,
      width / 2 + dx * length / 2,
      height / 2 + dy * length / 2
    );
    spec.colors.forEach((color, i3) => gradient.addColorStop(i3 / Math.max(1, spec.colors.length - 1), color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  function rounded(ctx, rect, radius) {
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  }
  function drawCaption(ctx, plan, caption) {
    const r3 = plan.layout.caption, spec = plan.captions;
    if (!r3 || !caption || caption.alpha <= 0) return;
    const size = plan.output.height * spec.fontSizePct / 100, padding = size * 0.6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r3.x, r3.y, r3.w, r3.h);
    ctx.clip();
    ctx.globalAlpha = caption.alpha;
    ctx.font = `${spec.fontWeight} ${size}px Inter`;
    const wrapped = wrapLines(caption.text, r3.w - padding * 2, (text) => ctx.measureText(text).width, { maxLines: spec.maxLines });
    const scale = Math.min(wrapped.scale, (r3.h - padding) / (size * 1.25 * wrapped.lines.length));
    ctx.font = `${spec.fontWeight} ${size * scale}px Inter`;
    const lineH = size * scale * 1.25;
    if (spec.mode === "overlay") {
      const w3 = Math.min(r3.w, Math.max(...wrapped.lines.map((s3) => ctx.measureText(s3).width)) + padding * 2);
      rounded(ctx, {
        x: spec.align === "left" ? r3.x : r3.x + (r3.w - w3) / 2,
        y: r3.y + (r3.h - lineH * wrapped.lines.length) / 2 - padding / 2,
        w: w3,
        h: lineH * wrapped.lines.length + padding
      }, padding);
      ctx.fillStyle = spec.background;
      ctx.fill();
    }
    ctx.fillStyle = spec.color;
    ctx.textAlign = spec.align;
    ctx.textBaseline = "middle";
    wrapped.lines.forEach((line, i3) => ctx.fillText(
      line,
      spec.align === "left" ? r3.x + padding : r3.x + r3.w / 2,
      r3.y + r3.h / 2 + (i3 - (wrapped.lines.length - 1) / 2) * lineH
    ));
    ctx.restore();
  }
  function card(ctx, plan, alpha, spec, title) {
    if (alpha <= 0) return;
    const { width, height } = plan.output;
    const x2 = width * (spec.align === "left" ? 0.08 : 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    background2(ctx, spec.background, width, height, plan.theme.card.background);
    if (spec.logo) {
      const img = images.get(spec.logo.image), h3 = height * spec.logo.heightPct / 100, w3 = h3 * img.width / img.height;
      ctx.drawImage(img, spec.align === "left" ? x2 : x2 - w3 / 2, height * 0.12, w3, h3);
    }
    if (spec.accent.enabled && spec.accent.shape !== "none") {
      const w3 = width * spec.accent.widthPct / 100;
      ctx.fillStyle = spec.accent.color;
      ctx.fillRect(spec.align === "left" ? x2 : x2 - w3 / 2, height * (spec.accent.shape === "underline" ? 0.56 : 0.34), w3, height * 8e-3);
    }
    ctx.textAlign = spec.align;
    ctx.textBaseline = "middle";
    for (const [text, fraction, weight, color, y3] of [
      [title, spec.titleSizePct / 100, 600, spec.titleColor, 0.48],
      [spec.subtitle, spec.subtitleSizePct / 100, 400, spec.subtitleColor, 0.64]
    ]) {
      if (!text) continue;
      const size = height * fraction;
      ctx.font = `${weight} ${size}px Inter`;
      const wrapped = wrapLines(text, width * 0.84, (s3) => ctx.measureText(s3).width);
      ctx.font = `${weight} ${size * wrapped.scale}px Inter`;
      ctx.fillStyle = color;
      wrapped.lines.forEach((line, i3) => ctx.fillText(
        line,
        x2,
        height * y3 + (i3 - (wrapped.lines.length - 1) / 2) * size * wrapped.scale * 1.2
      ));
    }
    ctx.restore();
  }
  function cursorShape(ctx, style) {
    ctx.beginPath();
    if (style === "dot" || style === "ring") ctx.arc(0, 0, 12, 0, Math.PI * 2);
    else if (style === "crosshair") {
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
    } else if (style === "text") {
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.moveTo(-4, -12);
      ctx.lineTo(4, -12);
      ctx.moveTo(-4, 12);
      ctx.lineTo(4, 12);
    } else if (style === "hand") {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-2, 0, -2, 2, -2, 4);
      ctx.lineTo(-2, 13);
      ctx.lineTo(-5, 10);
      ctx.quadraticCurveTo(-8, 9, -7, 13);
      ctx.lineTo(-2, 21);
      ctx.quadraticCurveTo(0, 24, 3, 24);
      ctx.lineTo(9, 24);
      ctx.lineTo(12, 14);
      ctx.quadraticCurveTo(13, 10, 9, 10);
      ctx.lineTo(2, 9);
      ctx.lineTo(2, 3);
      ctx.quadraticCurveTo(2, 0, 0, 0);
      ctx.closePath();
    } else if (style === "pointer") {
      ctx.moveTo(0, 14);
      ctx.lineTo(0, 2);
      ctx.quadraticCurveTo(2, -2, 4, 2);
      ctx.lineTo(4, 9);
      ctx.lineTo(12, 10);
      ctx.quadraticCurveTo(16, 10, 15, 15);
      ctx.lineTo(13, 23);
      ctx.lineTo(5, 23);
      ctx.lineTo(-3, 15);
      ctx.closePath();
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 19);
      ctx.lineTo(5, 15);
      ctx.lineTo(9, 24);
      ctx.lineTo(13, 22);
      ctx.lineTo(9, 14);
      ctx.lineTo(16, 14);
      ctx.closePath();
    }
  }
  function sourceSize(source) {
    return {
      width: source.videoWidth ?? source.naturalWidth ?? source.displayWidth ?? source.width,
      height: source.videoHeight ?? source.naturalHeight ?? source.displayHeight ?? source.height
    };
  }
  function sourceCrop(plan, camera, decoded) {
    const size = sourceSize(decoded);
    const sx = size.width / plan.sourceSize.width, sy = size.height / plan.sourceSize.height;
    const w3 = plan.sourceSize.width / camera.z, h3 = plan.sourceSize.height / camera.z;
    return {
      x: (camera.cx * plan.scale - w3 / 2) * sx,
      y: (camera.cy * plan.scale - h3 / 2) * sy,
      width: w3 * sx,
      height: h3 * sy
    };
  }
  function drawFrame(canvas, plan, tOut, decoded, assets) {
    if (assets) {
      images = assets.images;
      cursorImages = assets.cursorImages;
    }
    const ctx = canvas.getContext("2d"), { width, height } = plan.output;
    const state = stateAt(plan, tOut), f3 = plan.layout.frame, cam = state.camera;
    background2(ctx, plan.frame.background, width, height, plan.theme.background);
    if (plan.captions.enabled && plan.captions.mode === "band") {
      const r3 = plan.layout.caption;
      ctx.fillStyle = plan.captions.background;
      ctx.fillRect(r3.x, r3.y, r3.w, r3.h);
    }
    if (state.section === "main" && decoded) {
      const unit = height / 1080, radius = plan.frame.radiusPx * unit;
      ctx.save();
      rounded(ctx, f3, radius);
      ctx.shadowColor = `rgba(0,0,0,${plan.frame.shadow.enabled ? plan.frame.shadow.opacity : 0})`;
      ctx.shadowBlur = plan.frame.shadow.blurPx * unit;
      ctx.shadowOffsetY = plan.frame.shadow.offsetYPx * unit;
      ctx.fillStyle = "#808080";
      ctx.fill();
      ctx.restore();
      ctx.save();
      rounded(ctx, f3, radius);
      ctx.clip();
      const cropW = plan.sourceSize.width / cam.z, cropH = plan.sourceSize.height / cam.z;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const crop = sourceCrop(plan, cam, decoded);
      ctx.drawImage(decoded, crop.x, crop.y, crop.width, crop.height, f3.x, f3.y, f3.w, f3.h);
      const mapped = ({ x: x2, y: y3 }) => ({
        x: f3.x + (x2 * plan.scale - (cam.cx * plan.scale - cropW / 2)) * f3.w / cropW,
        y: f3.y + (y3 * plan.scale - (cam.cy * plan.scale - cropH / 2)) * f3.h / cropH
      });
      const cursorH = plan.cursor.sizePx * (plan.cursor.scaleWithZoom ? 1 + 0.35 * (cam.z - 1) : 1);
      if (state.ripple) {
        const p3 = mapped(state.ripple), progress = state.ripple.progress;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = plan.cursor.clickEffect.color ?? plan.theme.ripple.color;
        ctx.lineWidth = 3 * unit;
        ctx.beginPath();
        ctx.arc(p3.x, p3.y, cursorH * plan.cursor.clickEffect.sizeMult * (0.3 + 2.9 * progress), 0, Math.PI * 2);
        if (plan.cursor.clickEffect.style === "pulse") {
          ctx.fillStyle = ctx.strokeStyle;
          ctx.globalAlpha *= 0.35;
          ctx.fill();
        } else ctx.stroke();
        ctx.restore();
      }
      if (plan.cursor.visible) {
        const p3 = mapped(state.cursor);
        const cursorScale = cursorH * state.cursor.press * state.cursor.pop / 24;
        ctx.save();
        ctx.translate(p3.x, p3.y);
        ctx.scale(cursorScale, cursorScale);
        let style = state.cursor.shape === "arrow" ? plan.cursor.style : state.cursor.shape;
        ctx.globalAlpha = state.cursor.alpha;
        if (plan.cursor.shadow) {
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 3;
        }
        const spec = plan.cursor.style === "custom" ? customCursorSpec(plan.cursor, state.cursor.shape) : null;
        const img = spec && cursorImages.get(spec.image);
        if (img) {
          const h3 = 24, w3 = h3 * img.naturalWidth / img.naturalHeight;
          ctx.drawImage(img, -(spec.hotspot?.x ?? 0) * w3, -(spec.hotspot?.y ?? 0) * h3, w3, h3);
        } else {
          if (plan.cursor.style === "custom") style = "arrow";
          cursorShape(ctx, style);
          ctx.fillStyle = plan.cursor.fill;
          ctx.strokeStyle = plan.cursor.stroke;
          ctx.lineWidth = 1.5 * unit / cursorScale;
          ctx.lineJoin = "round";
          if (!["ring", "crosshair", "text"].includes(style)) ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      if (plan.frame.border.enabled) {
        ctx.save();
        rounded(ctx, f3, radius);
        ctx.strokeStyle = plan.frame.border.color;
        ctx.lineWidth = plan.frame.border.widthPx * unit;
        ctx.stroke();
        ctx.restore();
      }
      drawCaption(ctx, plan, state.caption);
    }
    card(ctx, plan, state.alphaTitle, plan.cards.title, plan.cards.title.title);
    card(ctx, plan, state.alphaOutro, plan.cards.outro, plan.cards.outro.text);
    return canvas;
  }

  // editor/helpers.mjs
  function timecode(seconds, fps = 30) {
    const frames = Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) * fps + 1e-7));
    return [
      Math.floor(frames / fps / 3600),
      Math.floor(frames / fps / 60) % 60,
      Math.floor(frames / fps) % 60,
      frames % fps
    ].map((n2) => String(n2).padStart(2, "0")).join(":");
  }
  function groupSettings(settings, query = "") {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const groups = {};
    for (const setting of settings) {
      if (words.every((word) => setting.label.toLowerCase().includes(word))) (groups[setting.group] ??= []).push(setting);
    }
    return groups;
  }
  function errorsForPath(errors, path) {
    return errors.filter((error) => {
      const setting = /"([^"]+)"/.exec(error)?.[1];
      return setting && (setting === path || setting.startsWith(`${path}.`) || path.startsWith(`${setting}.`));
    });
  }
  function parseSSE(block) {
    let event = "message";
    const data = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "event") event = value;
      if (field === "data") data.push(value);
    }
    if (!data.length) return null;
    return { event, data: JSON.parse(data.join("\n")) };
  }
  function createSSEParser(onEvent) {
    let buffer = "";
    return (chunk) => {
      buffer += chunk;
      let match;
      while (match = /\r?\n\r?\n/.exec(buffer)) {
        const parsed = parseSSE(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
        if (parsed) onEvent(parsed);
      }
    };
  }
  var isTyping = (target) => !!target?.closest?.('input, textarea, select, [contenteditable="true"]');

  // editor/playback.mjs
  function playbackSync(sourceT, videoTime, planRate, uiRate) {
    return {
      action: Math.abs(videoTime - sourceT) > 0.12 ? "seek" : "none",
      playbackRate: Math.max(0.25, Math.min(8, planRate * uiRate))
    };
  }
  function previewBelowRate(samples, averageFrameRate) {
    if (samples.length < 2 || !(averageFrameRate > 0)) return false;
    const seconds = (samples.at(-1).now - samples[0].now) / 1e3;
    const expected = samples.slice(1).reduce((sum, s3) => sum + s3.expected, 0);
    const presented = samples.slice(1).reduce((sum, s3) => sum + s3.presented, 0);
    return seconds >= 1.8 && expected > 0 && presented / seconds < 24 && presented < expected * 0.7;
  }

  // editor/Preview.jsx
  function Preview({ plan, provider, time, setTime, playing, setPlaying, onPick, focus }) {
    const video = A2(), canvas = A2(), current = A2(time), drawn = A2(null);
    const [loop, setLoop] = d2(false), [rate, setRate] = d2(1);
    const [assets, setAssets] = d2(null), [error, setError] = d2(""), [dropped, setDropped] = d2(false);
    current.current = time;
    const duration = plan?.timemap.outputDuration ?? 0, fps = plan?.output.fps ?? 30;
    h2(() => {
      let active = true;
      setAssets(null);
      setError("");
      if (plan) Promise.all([
        loadFonts({ regular: "/fonts/Inter-Regular.woff2", semibold: "/fonts/Inter-SemiBold.woff2" }),
        loadAssets(plan, { assetBase: "/media/asset/" })
      ]).then(([, loaded]) => {
        if (active) setAssets(loaded);
      }).catch((e3) => {
        if (active) setError(e3.message);
      });
      return () => {
        active = false;
      };
    }, [plan]);
    h2(() => {
      if (time > duration) setTime(duration);
    }, [duration]);
    h2(() => {
      const media = video.current;
      provider?.pause();
      if (!plan || !provider || !assets || !media) return;
      let active = true, raf, busy = false, lastTime = -1, last2 = performance.now();
      let main = false, starting = false, seeking = false, frameCallback;
      let serial = 0, drawnSerial = 0, expected = 0, previousFrame = null;
      const samples = [], perf = window.__editorPerf ??= { presentedFrames: 0, lastFrameMs: 0 };
      setDropped(false);
      const fail = (e3) => {
        if (active) {
          setError(e3.message);
          setPlaying(false);
        }
      };
      const resetFrames = () => {
        previousFrame = null;
        expected = 0;
        samples.length = 0;
        setDropped(false);
      };
      const seeked = () => {
        seeking = false;
        resetFrames();
      };
      media.addEventListener("seeked", seeked);
      const presented = (now, metadata) => {
        if (!active) return;
        if (main && !seeking && !media.seeking) {
          if (previousFrame && metadata.mediaTime !== previousFrame.mediaTime) {
            serial++;
            const elapsed = Math.max(0, metadata.mediaTime - previousFrame.mediaTime);
            expected += Math.min(
              elapsed * provider.averageFrameRate,
              Math.max(0, metadata.presentedFrames - previousFrame.presentedFrames)
            );
          } else if (!previousFrame) serial++;
          previousFrame = metadata;
        }
        frameCallback = media.requestVideoFrameCallback(presented);
      };
      if (playing && media.requestVideoFrameCallback) frameCallback = media.requestVideoFrameCallback(presented);
      function paint(t3, state, frame) {
        const start = performance.now(), target = canvas.current, scale = Math.min(960 / plan.output.width, 1);
        const width = Math.round(plan.output.width * scale), height = Math.round(plan.output.height * scale);
        if (target.width !== width || target.height !== height) {
          target.width = width;
          target.height = height;
        }
        target.getContext("2d").setTransform(width / plan.output.width, 0, 0, height / plan.output.height, 0, 0);
        drawFrame(target, plan, t3, frame, assets);
        drawn.current = { plan, state };
        lastTime = t3;
        if (playing) perf.lastFrameMs = performance.now() - start;
      }
      const tick = async (now) => {
        if (!active) return;
        raf = requestAnimationFrame(tick);
        if (playing) {
          let next = current.current + (now - last2) / 1e3 * rate;
          if (next >= duration) {
            next = loop ? next % duration : duration;
            if (!loop) {
              media.pause();
              setPlaying(false);
            }
          }
          current.current = next;
          setTime(next);
        }
        last2 = now;
        const t3 = current.current, state = stateAt(plan, t3);
        try {
          if (playing) {
            const inMain = state.section === "main";
            if (inMain !== main) {
              main = inMain;
              resetFrames();
            }
            if (!main) {
              media.pause();
              paint(t3, state, null);
              return;
            }
            const sync = playbackSync(state.sourceT, media.currentTime, state.rate, rate);
            if (media.playbackRate !== sync.playbackRate) media.playbackRate = sync.playbackRate;
            if (!seeking && !media.seeking && media.readyState >= 1 && sync.action === "seek") {
              seeking = true;
              resetFrames();
              media.currentTime = state.sourceT;
            }
            if (media.paused && !starting) {
              starting = true;
              media.play().catch((e3) => {
                if (e3.name !== "AbortError") fail(e3);
              }).finally(() => {
                starting = false;
              });
            }
            let count = 0;
            if (!seeking && !media.seeking && media.readyState >= 2) {
              paint(t3, state, media);
              if (serial !== drawnSerial) {
                count = 1;
                perf.presentedFrames++;
                drawnSerial = serial;
              }
            }
            samples.push({ now, expected, presented: count });
            expected = 0;
            while (samples.length > 1 && samples[0].now < now - 2e3) samples.shift();
            setDropped(previewBelowRate(samples, provider.averageFrameRate));
          } else {
            media.pause();
            if (busy || t3 === lastTime) return;
            busy = true;
            try {
              const frame = state.section === "main" ? await provider.getFrame(state.sourceT) : null;
              if (active && current.current === t3) paint(t3, state, frame);
            } finally {
              busy = false;
            }
          }
        } catch (e3) {
          fail(e3);
        }
      };
      raf = requestAnimationFrame(tick);
      return () => {
        active = false;
        cancelAnimationFrame(raf);
        media.pause();
        provider.pause();
        media.removeEventListener("seeked", seeked);
        if (frameCallback !== void 0) media.cancelVideoFrameCallback(frameCallback);
      };
    }, [plan, provider, assets, playing, duration, rate, loop]);
    function pick2(event) {
      if (!onPick || !drawn.current) return;
      const { plan: p3, state } = drawn.current;
      if (state.section !== "main") return;
      const rect = canvas.current.getBoundingClientRect(), f3 = p3.layout.frame;
      const x2 = (event.clientX - rect.left) / rect.width * p3.output.width;
      const y3 = (event.clientY - rect.top) / rect.height * p3.output.height;
      if (x2 < f3.x || x2 > f3.x + f3.w || y3 < f3.y || y3 > f3.y + f3.h) return;
      const camera = state.camera;
      onPick({
        x: camera.cx + ((x2 - f3.x) / f3.w - 0.5) * p3.sourceSize.width / camera.z / p3.scale,
        y: camera.cy + ((y3 - f3.y) / f3.h - 0.5) * p3.sourceSize.height / camera.z / p3.scale
      });
    }
    let crosshair = null;
    if (plan && focus) {
      const state = stateAt(plan, time), f3 = plan.layout.frame;
      const k3 = focus.keyframes.findLast((k4) => k4.t <= state.sourceT) ?? focus.keyframes[0];
      if (k3 && state.section === "main") {
        const x2 = f3.x + (0.5 + (k3.x - state.camera.cx) * state.camera.z * plan.scale / plan.sourceSize.width) * f3.w;
        const y3 = f3.y + (0.5 + (k3.y - state.camera.cy) * state.camera.z * plan.scale / plan.sourceSize.height) * f3.h;
        if (x2 >= f3.x && x2 <= f3.x + f3.w && y3 >= f3.y && y3 <= f3.y + f3.h) crosshair = { left: `${x2 / plan.output.width * 100}%`, top: `${y3 / plan.output.height * 100}%` };
      }
    }
    const step = (direction) => {
      setPlaying(false);
      setTime(Math.max(0, Math.min(duration, time + direction / fps)));
    };
    return /* @__PURE__ */ k("section", { class: "preview", "aria-label": "Video preview" }, /* @__PURE__ */ k("video", { ref: video, src: "/media/raw.mp4", muted: true, playsInline: true, preload: "auto", hidden: true }), /* @__PURE__ */ k("div", { class: "preview-stage" }, /* @__PURE__ */ k("div", { class: "preview-canvas-wrap", style: { "--preview-aspect": plan ? plan.output.width / plan.output.height : 16 / 9 } }, /* @__PURE__ */ k("canvas", { ref: canvas, onClick: pick2, "aria-label": "Composition preview; click to pick zoom focus", style: { aspectRatio: plan ? `${plan.output.width}/${plan.output.height}` : "16/9" } }), crosshair && /* @__PURE__ */ k("span", { class: "focus-crosshair", style: crosshair, "aria-label": "Selected zoom focus" }, "+"))), error && /* @__PURE__ */ k("p", { class: "error", role: "alert" }, error), dropped && /* @__PURE__ */ k("p", { class: "warning", role: "status" }, "Preview below 24 fps \u2014 frames are being dropped."), /* @__PURE__ */ k("div", { class: "transport" }, /* @__PURE__ */ k("button", { onClick: () => step(-1), title: "Previous frame (,)", disabled: !plan }, "\u2039"), /* @__PURE__ */ k("button", { onClick: () => setPlaying(!playing), disabled: !plan || !assets, "aria-label": playing ? "Pause" : "Play" }, playing ? "Pause" : "Play"), /* @__PURE__ */ k("button", { onClick: () => step(1), title: "Next frame (.)", disabled: !plan }, "\u203A"), /* @__PURE__ */ k("output", { class: "timecode" }, timecode(time, fps), " / ", timecode(duration, fps)), /* @__PURE__ */ k("label", { class: "seek" }, /* @__PURE__ */ k("span", { class: "sr-only" }, "Seek"), /* @__PURE__ */ k("input", { type: "range", "aria-label": "Seek output time", min: "0", max: duration, step: 1 / fps, value: time, onInput: (e3) => {
      setPlaying(false);
      setTime(+e3.currentTarget.value);
    } })), /* @__PURE__ */ k("label", null, /* @__PURE__ */ k("input", { type: "checkbox", checked: loop, onChange: (e3) => setLoop(e3.currentTarget.checked) }), " Loop"), /* @__PURE__ */ k("label", null, /* @__PURE__ */ k("span", { class: "sr-only" }, "Playback rate"), /* @__PURE__ */ k("select", { "aria-label": "Playback rate", value: rate, onChange: (e3) => setRate(+e3.currentTarget.value) }, [0.5, 1, 2].map((n2) => /* @__PURE__ */ k("option", { value: n2 }, n2, "\xD7"))))));
  }

  // scripts/lib/compose/settings-schema.mjs
  var EXCLUDED = [
    { path: "version", reason: "Composition format version; managed by Showreel." },
    { path: "run.id", reason: "Recording identity; selected when opening the project." },
    { path: "edits.trims", reason: "Edited on the timeline." },
    { path: "edits.speeds", reason: "Edited on the timeline." },
    { path: "zoom.regions", reason: "Edited on the timeline and preview." },
    { path: "captions.cues", reason: "Source-time caption overrides edited on the timeline." },
    { path: "cursor.custom", reason: "Container; use the individual image and hotspot settings." },
    ...["arrow", "hand", "text"].flatMap((shape) => ["", ".hotspot"].map((suffix) => ({
      path: `cursor.custom.${shape}${suffix}`,
      reason: "Container; use the individual image and hotspot settings."
    }))),
    ...["title", "outro"].map((k3) => ({ path: `cards.${k3}.logo`, reason: "Container; use logo image and height settings." }))
  ];
  var excluded = new Set(EXCLUDED.map((s3) => s3.path));
  var names = {
    theme: "Theme",
    width: "Width",
    height: "Height",
    fps: "Frame rate",
    quality: "Quality",
    paddingXPct: "Horizontal padding",
    paddingYPct: "Vertical padding",
    paddingPct: "Padding on both axes",
    radiusPx: "Corner radius",
    enabled: "Enabled",
    blurPx: "Blur",
    offsetYPx: "Vertical offset",
    opacity: "Opacity",
    color: "Colour",
    widthPx: "Width",
    type: "Style",
    colors: "Gradient colours",
    angle: "Gradient angle",
    image: "Image",
    visible: "Show cursor",
    style: "Style",
    sizePct: "Cursor size",
    fill: "Fill colour",
    stroke: "Outline colour",
    shadow: "Show cursor shadow",
    scaleWithZoom: "Scale with zoom",
    hideWhenIdleSec: "Hide after idle",
    pressScale: "Size while pressed",
    autoShape: "Match cursor to target",
    distancePx: "Travel distance",
    durationSec: "Duration",
    startAfterClickSec: "Delay after click",
    microCorrection: "Subtle cursor correction",
    entrance: "Animate cursor entrance",
    sizeMult: "Effect size",
    depth: "Zoom depth",
    autoSuggest: "Suggest zoom regions",
    speed: "Camera movement",
    holdAfterClickSec: "Hold after click",
    leadInSec: "Delay before zoom",
    onlyKinds: "Zoom trigger types",
    mode: "Caption layout",
    position: "Caption position",
    bandHeightPct: "Caption band height",
    fontSizePct: "Text size",
    fontWeight: "Text weight",
    background: "Background colour",
    maxLines: "Maximum lines",
    align: "Text alignment",
    title: "Title text",
    text: "Outro text",
    subtitle: "Subtitle text",
    titleSizePct: "Title size",
    subtitleSizePct: "Subtitle size",
    titleColor: "Title colour",
    subtitleColor: "Subtitle colour",
    shape: "Accent shape",
    widthPct: "Accent width",
    heightPct: "Height",
    fade: "Transition duration",
    transition: "Transition style",
    x: "Horizontal hotspot",
    y: "Vertical hotspot"
  };
  var sections = {
    shadow: "Frame shadow",
    border: "Frame border",
    background: "Background",
    followThrough: "Cursor follow through",
    clickEffect: "Click effect",
    accent: "Accent",
    logo: "Logo",
    arrow: "Arrow cursor",
    hand: "Hand cursor",
    text: "Text cursor"
  };
  var labelFor = (path) => {
    const parts = path.split("."), leaf = parts.at(-1), parent = parts.at(-2);
    if (parent === "hotspot") return `${sections[parts.at(-3)]} ${names[leaf].toLowerCase()}`;
    if (leaf === "enabled") return {
      zoom: "Enable zoom",
      captions: "Show captions",
      title: "Show title card",
      outro: "Show outro card",
      shadow: "Show frame shadow",
      border: "Show frame border",
      followThrough: "Enable follow through",
      accent: "Show accent"
    }[parent];
    if (path === "cursor.clickEffect.sizeMult") return "Click effect size";
    if (path === "cursor.custom.heightPct") return "Custom cursor height";
    if (path === "cursor.style") return "Cursor style";
    if (path === "cursor.clickEffect.style") return "Show click effect";
    const prefix = sections[parent];
    return prefix && ["style", "color", "widthPx", "type", "colors", "angle", "image", "durationSec", "sizeMult", "heightPct", "x", "y"].includes(leaf) ? `${prefix} ${names[leaf].toLowerCase()}` : names[leaf];
  };
  var unitFor = (path) => /Pct$/.test(path) ? "%" : /Px$|output\.(width|height)$/.test(path) ? "px" : /Sec$|cards.fade$/.test(path) ? "s" : /Mult$|pressScale$|zoom.depth$/.test(path) ? "x" : void 0;
  var helpFor = (path, label) => ({
    "zoom.onlyKinds": "Enter a JSON list of click and fill actions that should trigger a suggested zoom.",
    "zoom.depth": "Choose how much to magnify the recording during a zoom region.",
    "frame.paddingXPct": "Set the space on the left and right as a percentage of the output width.",
    "frame.paddingYPct": "Set the space above and below as a percentage of the output height.",
    "cursor.clickEffect.style": "Choose a ripple or pulse to highlight clicks, or none to hide the effect.",
    "cursor.hideWhenIdleSec": "Hide the cursor after this many seconds without movement.",
    "zoom.autoSuggest": "Generate zoom regions from recorded clicks and typing when no regions are saved."
  })[path] ?? (unitFor(path) === "%" ? `Adjust ${label.toLowerCase()} as a percentage of the containing frame.` : unitFor(path) === "s" ? `Set ${label.toLowerCase()} in seconds.` : unitFor(path) === "px" ? `Set ${label.toLowerCase()} in output pixels.` : unitFor(path) === "x" ? `Set the multiplier for ${label.toLowerCase()}.` : `Choose ${label.toLowerCase()} for the ${path.startsWith("cards.title") ? "title card" : path.startsWith("cards.outro") ? "outro card" : path.split(".")[0] === "frame" ? "video frame" : path.split(".")[0]} settings.`);
  var SETTINGS = Object.entries(compositionPaths({})).filter(([path]) => !excluded.has(path)).map(([path, value]) => {
    const group = /^(frame\.|theme$)/.test(path) ? "look" : path.split(".")[0];
    const options = SETTING_ENUMS[path];
    const range2 = SETTING_RANGES[path];
    const control = options ? "select" : range2 ? "number" : typeof value === "boolean" ? "toggle" : path.endsWith(".colors") ? "gradient" : path.endsWith(".image") ? "image" : /(?:color|Color|fill|stroke|captions.background)$/.test(path) ? "color" : "text";
    return {
      path,
      group,
      section: path.startsWith("cards.") ? `${path.split(".")[1]} card \xB7 ${sections[path.split(".")[2]] ?? "Text and timing"}` : sections[path.split(".")[1]] ?? "General",
      label: labelFor(path),
      help: helpFor(path, labelFor(path)),
      unit: unitFor(path),
      control,
      ...range2 ?? {},
      ...options ? { options } : {},
      advanced: /custom|hotspot|followThrough|pressScale|microCorrection|paddingPct/.test(path)
    };
  });
  var byPath = new Map(SETTINGS.map((s3) => [s3.path, s3]));

  // editor/Settings.jsx
  function Color({ value, onChange, label, id, invalid }) {
    return /* @__PURE__ */ k("div", { class: "control-row" }, /* @__PURE__ */ k("input", { type: "color", "aria-label": `${label} picker`, value: /^#[\da-f]{6}$/i.test(value) ? value : "#000000", onInput: (e3) => onChange(e3.currentTarget.value) }), /* @__PURE__ */ k("input", { id, "aria-label": label, "aria-invalid": invalid || void 0, "aria-describedby": invalid ? `${id}-error` : void 0, type: "text", value: value ?? "", onInput: (e3) => onChange(e3.currentTarget.value || null) }));
  }
  function Control({ setting: s3, value, onChange, values, change, invalid }) {
    const id = `setting-${s3.path}`, label = s3.label;
    const common = { id, "aria-label": label, "aria-invalid": invalid || void 0, "aria-describedby": invalid ? `${id}-error` : void 0 };
    if (s3.control === "toggle") return /* @__PURE__ */ k("input", { ...common, type: "checkbox", checked: !!value, onChange: (e3) => onChange(e3.currentTarget.checked) });
    if (s3.control === "select") return /* @__PURE__ */ k("select", { ...common, value, onChange: (e3) => onChange(s3.options.find((v3) => String(v3) === e3.currentTarget.value)) }, s3.options.map((option) => /* @__PURE__ */ k("option", { value: option }, option)));
    if (s3.control === "number") {
      const numeric = s3.path === "zoom.depth" ? zoomDepth(value) : value;
      return /* @__PURE__ */ k("div", { class: "control-row" }, /* @__PURE__ */ k("input", { ...common, type: "range", min: s3.min, max: s3.max, step: s3.step, value: numeric ?? s3.min, onInput: (e3) => onChange(+e3.currentTarget.value) }), /* @__PURE__ */ k("input", { "aria-label": `${label} value`, "aria-invalid": invalid || void 0, type: "number", min: s3.min, max: s3.max, step: s3.step, value: numeric ?? "", onInput: (e3) => onChange(e3.currentTarget.value === "" ? null : +e3.currentTarget.value) }), s3.unit && /* @__PURE__ */ k("span", { class: "control-unit" }, s3.unit));
    }
    if (s3.control === "color") return /* @__PURE__ */ k(Color, { id, label, value, onChange, invalid });
    if (s3.control === "gradient") {
      const stops = Array.isArray(value) ? value : [], anglePath = s3.path.replace(/colors$/, "angle");
      return /* @__PURE__ */ k("div", { id, class: "gradient", role: "group", "aria-label": label }, stops.map((color, index) => /* @__PURE__ */ k("div", { class: "control-row" }, /* @__PURE__ */ k(Color, { label: `${label} stop ${index + 1}`, value: color, onChange: (next) => onChange(stops.map((c3, i3) => i3 === index ? next : c3)) }), /* @__PURE__ */ k("button", { "aria-label": `Remove stop ${index + 1}`, disabled: stops.length <= 2, onClick: () => onChange(stops.filter((_2, i3) => i3 !== index)) }, "\u2212"))), /* @__PURE__ */ k("button", { disabled: stops.length >= 4, onClick: () => onChange([...stops, stops.at(-1) ?? "#ffffff"]) }, "Add colour stop"), /* @__PURE__ */ k("label", null, "Angle ", /* @__PURE__ */ k("input", { "aria-label": `${label} angle`, type: "number", min: "0", max: "360", value: values[anglePath], onInput: (e3) => change(anglePath, +e3.currentTarget.value) })));
    }
    const array = Array.isArray(value);
    return /* @__PURE__ */ k(
      "input",
      {
        ...common,
        type: "text",
        value: array ? JSON.stringify(value) : value ?? "",
        placeholder: s3.control === "image" ? "Choose project file: relative/path.png" : "",
        onInput: (e3) => {
          const text = e3.currentTarget.value;
          if (s3.path === "zoom.onlyKinds") {
            try {
              onChange(JSON.parse(text));
            } catch {
              onChange(text);
            }
          } else onChange(text || null);
        }
      }
    );
  }
  function Settings({ state, store }) {
    const [query, setQuery] = d2(""), [tab, setTab] = d2("look");
    const groups = groupSettings(SETTINGS, query), names2 = Object.keys(groups), active = groups[tab] ? tab : names2[0];
    const values = compositionPaths(state.composition);
    const change = (path, value) => store.change(path, value);
    function field(s3) {
      const errors = errorsForPath(state.errors, s3.path), id = `setting-${s3.path}`;
      return /* @__PURE__ */ k("div", { class: "setting", key: s3.path }, /* @__PURE__ */ k("div", { class: "setting-label" }, /* @__PURE__ */ k("label", { for: id, title: s3.help }, s3.label), /* @__PURE__ */ k("button", { class: "reset", "aria-label": `Reset ${s3.label}`, title: "Reset to default", onClick: () => store.change(s3.path, void 0, { reset: true }) }, "\u21BA")), /* @__PURE__ */ k(Control, { setting: s3, value: values[s3.path], onChange: (value) => change(s3.path, value), values, change, invalid: !!errors.length }), /* @__PURE__ */ k("p", { class: "setting-help" }, s3.help), !!errors.length && /* @__PURE__ */ k("p", { class: "error", id: `${id}-error` }, errors.join("\n")));
    }
    function fields(entries) {
      const sections2 = {};
      for (const entry of entries) (sections2[entry.section] ??= []).push(entry);
      return Object.entries(sections2).map(([name, items]) => /* @__PURE__ */ k("fieldset", { class: "setting-group", key: name }, /* @__PURE__ */ k("legend", null, name), items.map(field)));
    }
    return /* @__PURE__ */ k("aside", { class: "settings", "aria-label": "Composition settings" }, /* @__PURE__ */ k("div", { class: "panel-heading" }, /* @__PURE__ */ k("h2", null, "Settings"), /* @__PURE__ */ k("span", null, "COMPOSITION")), /* @__PURE__ */ k("label", { class: "search" }, /* @__PURE__ */ k("span", { class: "sr-only" }, "Search settings"), /* @__PURE__ */ k("input", { type: "search", placeholder: "Search settings\u2026", value: query, onInput: (e3) => setQuery(e3.currentTarget.value) })), /* @__PURE__ */ k("div", { class: "tabs", role: "tablist", "aria-label": "Settings groups", onKeyDown: (e3) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e3.key)) return;
      e3.preventDefault();
      const index = names2.indexOf(active), next = e3.key === "Home" ? 0 : e3.key === "End" ? names2.length - 1 : (index + (e3.key === "ArrowRight" ? 1 : -1) + names2.length) % names2.length;
      setTab(names2[next]);
      document.getElementById(`tab-${names2[next]}`)?.focus();
    } }, names2.map((name) => /* @__PURE__ */ k("button", { role: "tab", id: `tab-${name}`, "aria-selected": active === name, "aria-controls": `panel-${name}`, tabIndex: active === name ? 0 : -1, onClick: () => setTab(name) }, name))), active ? /* @__PURE__ */ k("div", { class: "settings-body", role: "tabpanel", id: `panel-${active}`, "aria-labelledby": `tab-${active}` }, fields(groups[active].filter((s3) => !s3.advanced)), groups[active].some((s3) => s3.advanced) && /* @__PURE__ */ k("details", null, /* @__PURE__ */ k("summary", null, "Advanced settings"), fields(groups[active].filter((s3) => s3.advanced)))) : /* @__PURE__ */ k("p", { class: "empty" }, "No matching settings"));
  }

  // editor/ExportDialog.jsx
  function ExportDialog({ store, onClose }) {
    const initial = store.getState().composition.output;
    const [size, setSize] = d2(initial.height > 1080 ? "4k" : "1080"), [fps, setFps] = d2(initial.fps);
    const [job, setJob] = d2({ event: "idle", data: {} }), [error, setError] = d2(""), [busy, setBusy] = d2(false);
    const [eta, setEta] = d2(null), dialog = A2(), started = A2(0), stream = A2(null);
    const running = busy || ["started", "progress", "log"].includes(job.event);
    h2(() => {
      dialog.current.showModal();
      watch();
      return () => stream.current?.abort();
    }, []);
    async function watch() {
      stream.current?.abort();
      const controller = new AbortController();
      stream.current = controller;
      if (!started.current) started.current = performance.now();
      try {
        const response = await fetch("/api/export/events", { credentials: "same-origin", signal: controller.signal });
        if (!response.ok || !response.body) throw new Error("Cannot connect to export progress");
        const reader = response.body.getReader(), decoder = new TextDecoder();
        const parse = createSSEParser((message) => {
          setJob((previous) => ({ ...message, data: message.event === "log" ? { ...previous.data, ...message.data } : message.data }));
          if (message.event === "started") {
            started.current = performance.now();
            setEta(null);
          }
          if (message.event === "progress" && message.data.frame > 0) setEta(Math.max(0, Math.round((performance.now() - started.current) / 1e3 / message.data.frame * (message.data.total - message.data.frame))));
          if (["complete", "error", "cancelled"].includes(message.event)) controller.abort();
        });
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          parse(decoder.decode(value, { stream: true }));
        }
        if (!controller.signal.aborted) throw new Error("Export progress connection closed. Reconnect to check the job.");
      } catch (e3) {
        if (!controller.signal.aborted) setError(e3.message);
      }
    }
    async function start() {
      setError("");
      setBusy(true);
      try {
        let composition = store.getState().composition;
        for (const [path, value] of [["output.width", size === "4k" ? 3840 : 1920], ["output.height", size === "4k" ? 2160 : 1080], ["output.fps", fps]]) composition = changeComposition(composition, path, value);
        store.setComposition(composition, "output");
        await store.save();
        await request("/api/export", { method: "POST" });
        started.current = performance.now();
        setJob({ event: "started", data: {} });
        watch();
      } catch (e3) {
        setError(e3.message);
      } finally {
        setBusy(false);
      }
    }
    async function cancel() {
      try {
        await request("/api/export/cancel", { method: "POST" });
      } catch (e3) {
        setError(e3.message);
      }
    }
    return /* @__PURE__ */ k("dialog", { ref: dialog, onCancel: (e3) => {
      if (running) e3.preventDefault();
      else onClose();
    }, "aria-labelledby": "export-title" }, /* @__PURE__ */ k("div", { class: "dialog-heading" }, /* @__PURE__ */ k("h2", { id: "export-title" }, "Export composition"), /* @__PURE__ */ k("button", { disabled: running, "aria-label": "Close export", onClick: onClose }, "\xD7")), /* @__PURE__ */ k("div", { class: "export-options" }, /* @__PURE__ */ k("label", null, "Size ", /* @__PURE__ */ k("select", { disabled: running, value: size, onChange: (e3) => setSize(e3.currentTarget.value) }, /* @__PURE__ */ k("option", { value: "1080" }, "1080p"), /* @__PURE__ */ k("option", { value: "4k" }, "4K"))), /* @__PURE__ */ k("label", null, "Frame rate ", /* @__PURE__ */ k("select", { disabled: running, value: fps, onChange: (e3) => setFps(+e3.currentTarget.value) }, /* @__PURE__ */ k("option", { value: "30" }, "30 fps"), /* @__PURE__ */ k("option", { value: "60" }, "60 fps")))), /* @__PURE__ */ k("div", { "aria-live": "polite" }, /* @__PURE__ */ k("p", null, job.event === "idle" ? "Ready to export" : job.event), running && /* @__PURE__ */ k(S, null, /* @__PURE__ */ k("progress", { "aria-label": "Export progress", max: job.data.total ?? 1, value: job.data.frame ?? 0 }), /* @__PURE__ */ k("p", null, job.data.frame ?? 0, " / ", job.data.total ?? "\u2026", " frames", eta !== null ? ` \xB7 ETA ${eta}s` : "")), job.event === "complete" && /* @__PURE__ */ k(S, null, /* @__PURE__ */ k("p", { class: "output-path" }, job.data.finalFile), /* @__PURE__ */ k("button", { onClick: () => request("/api/reveal", { method: "POST" }).catch((e3) => setError(e3.message)) }, "Reveal")), job.event === "error" && /* @__PURE__ */ k("p", { class: "error" }, job.data.message)), error && /* @__PURE__ */ k("p", { role: "alert", class: "error" }, error), /* @__PURE__ */ k("div", { class: "dialog-actions" }, running ? /* @__PURE__ */ k(S, null, /* @__PURE__ */ k("button", { onClick: cancel }, "Cancel export"), error && /* @__PURE__ */ k("button", { onClick: () => {
      setError("");
      watch();
    } }, "Reconnect progress")) : /* @__PURE__ */ k("button", { class: "primary", onClick: start }, "Start export")));
  }

  // editor/TopBar.jsx
  function TopBar({ state, store }) {
    const [exportOpen, setExportOpen] = d2(false);
    const status = state.error ? "Error" : state.saving || state.dirty ? "Saving" : "Saved";
    return /* @__PURE__ */ k("header", { class: "topbar" }, /* @__PURE__ */ k("div", { class: "brand" }, "SHOWREEL", /* @__PURE__ */ k("span", null, "EDITOR")), /* @__PURE__ */ k("div", { class: "project-name" }, /* @__PURE__ */ k("strong", null, state.project?.name ?? "Loading project\u2026"), /* @__PURE__ */ k("small", null, state.project?.runId)), /* @__PURE__ */ k("span", { class: `save-status ${state.error ? "error" : ""}`, role: "status", title: state.error ?? "" }, status), state.error && state.dirty && /* @__PURE__ */ k("button", { onClick: () => store.save().catch(() => {
    }) }, "Retry save"), /* @__PURE__ */ k("div", { class: "history" }, /* @__PURE__ */ k("button", { disabled: !state.past.length, onClick: store.undo, title: "Undo (\u2318/Ctrl Z)" }, "Undo"), /* @__PURE__ */ k("button", { disabled: !state.future.length, onClick: store.redo, title: "Redo (\u2318/Ctrl Shift Z)" }, "Redo")), /* @__PURE__ */ k("button", { class: "primary", disabled: !state.composition, onClick: () => setExportOpen(true) }, "Export"), exportOpen && /* @__PURE__ */ k(ExportDialog, { store, onClose: () => setExportOpen(false) }));
  }

  // editor/edit-ops.mjs
  var snapFrame = (t3) => Math.round(t3 * 60) / 60;
  var clone2 = (c3) => structuredClone(c3);
  var overlap = (a3, b2) => a3.start < b2.end && b2.start < a3.end;
  function range(start, end, { duration = Infinity } = {}) {
    start = snapFrame(start);
    end = Math.min(duration, snapFrame(end));
    if (!Number.isFinite(start + end) || start < 0 || end > duration || end - start < 1 / 60 - 1e-9) throw new Error("Choose a valid range inside the recording.");
    return { start, end };
  }
  function finish(c3, { duration } = {}) {
    const result = validateComposition(c3, duration === void 0 ? {} : { duration });
    if (!result.ok) throw new Error(result.errors.join("\n"));
    return c3;
  }
  function merge2(ranges, speed = false) {
    return ranges.sort((a3, b2) => a3.start - b2.start).reduce((out, r3) => {
      const last2 = out.at(-1);
      if (last2 && r3.start <= last2.end + 1e-9 && (!speed || last2.rate === r3.rate)) last2.end = Math.max(last2.end, r3.end);
      else out.push({ ...r3 });
      return out;
    }, []);
  }
  var subtract = (ranges, cut) => ranges.flatMap((r3) => !overlap(r3, cut) ? [r3] : [
    ...r3.start < cut.start ? [{ ...r3, end: cut.start }] : [],
    ...r3.end > cut.end ? [{ ...r3, start: cut.end }] : []
  ]);
  var splitAt = (c3) => c3;
  function cutRange(c3, start, end, context = {}) {
    const r3 = range(start, end, context), next = clone2(c3);
    if (r3.end - r3.start < 0.1 - 1e-9) throw new Error("A cut must be at least 0.1 seconds.");
    next.edits.trims = merge2([...next.edits.trims, r3]);
    if (next.edits.trims.some((t3) => t3.start === 0 && t3.end >= context.duration)) throw new Error("Keep at least one frame of the recording.");
    next.edits.speeds = subtract(next.edits.speeds, r3);
    return finish(next, context);
  }
  function restoreRange(c3, index, context) {
    if (!c3.edits.trims[index]) throw new Error("Removed range no longer exists.");
    const next = clone2(c3);
    next.edits.trims.splice(index, 1);
    return finish(next, context);
  }
  function setSpeed(c3, start, end, rate, context = {}) {
    const r3 = range(start, end, context);
    if (!Number.isFinite(rate) || rate < 0.25 || rate > 8) throw new Error("Speed must be between 0.25 and 8.");
    if (c3.edits.trims.some((t3) => overlap(t3, r3))) throw new Error("Restore the removed range before changing its speed.");
    const next = clone2(c3);
    next.edits.speeds = merge2([...subtract(next.edits.speeds, r3), ...rate === 1 ? [] : [{ ...r3, rate }]], true);
    return finish(next, context);
  }
  function clearSpeed(c3, index, context) {
    if (!c3.edits.speeds[index]) throw new Error("Speed range no longer exists.");
    const next = clone2(c3);
    next.edits.speeds.splice(index, 1);
    return finish(next, context);
  }
  var uniqueId = (items, prefix) => {
    let n2 = 1;
    while (items.some((r3) => r3.id === `${prefix}${n2}`)) n2++;
    return `${prefix}${n2}`;
  };
  function addZoomRegion(c3, { tStart, tEnd, x: x2, y: y3, depth }, context = {}) {
    const r3 = range(tStart, tEnd, context), next = clone2(c3);
    if (next.zoom.regions.some((z3) => overlap({ start: z3.tStart, end: z3.tEnd }, r3))) throw new Error("Zoom regions cannot overlap; choose an empty range.");
    next.zoom.regions.push({ id: uniqueId(next.zoom.regions, "manual-"), tStart: r3.start, tEnd: r3.end, depth, keyframes: [{ t: r3.start, x: x2, y: y3 }], stepIds: [], source: "manual" });
    next.zoom.regions.sort((a3, b2) => a3.tStart - b2.tStart);
    return finish(next, context);
  }
  function updateZoomRegion(c3, id, patch, context = {}) {
    const next = clone2(c3), z3 = next.zoom.regions.find((z4) => z4.id === id);
    if (!z3) throw new Error("Zoom region no longer exists.");
    for (const k3 of Object.keys(patch)) if (!["tStart", "tEnd", "depth", "keyframes"].includes(k3)) throw new Error(`Cannot edit zoom ${k3}.`);
    const oldStart = z3.tStart;
    Object.assign(z3, clone2(patch), { source: "manual" });
    const r3 = range(z3.tStart, z3.tEnd, context);
    z3.tStart = r3.start;
    z3.tEnd = r3.end;
    if (!patch.keyframes) z3.keyframes = z3.keyframes.map((k3) => ({ ...k3, t: Math.max(z3.tStart, Math.min(z3.tEnd, k3.t + z3.tStart - oldStart)) }));
    z3.keyframes.sort((a3, b2) => a3.t - b2.t);
    if (z3.keyframes.length) z3.keyframes[0].t = z3.tStart;
    next.zoom.regions.sort((a3, b2) => a3.tStart - b2.tStart);
    return finish(next, context);
  }
  function deleteZoomRegion(c3, id, context) {
    const next = clone2(c3);
    next.zoom.regions = next.zoom.regions.filter((z3) => z3.id !== id);
    next.zoom.autoSuggest = false;
    return finish(next, context);
  }
  function setZoomFocus(c3, id, t3, x2, y3, context = {}) {
    const z3 = c3.zoom.regions.find((z4) => z4.id === id);
    if (!z3) throw new Error("Zoom region no longer exists.");
    t3 = Math.max(z3.tStart, Math.min(z3.tEnd, snapFrame(t3)));
    const keyframes = z3.keyframes.filter((k3) => Math.abs(k3.t - t3) > 1e-9);
    keyframes.push({ t: t3, x: x2, y: y3 });
    return updateZoomRegion(c3, id, { keyframes }, context);
  }
  function withCues(c3, context = {}) {
    const next = clone2(c3);
    next.captions.cues ??= clone2(context.plan?.cues ?? context.cues ?? []);
    return next;
  }
  function setCaption(c3, id, patch, context = {}) {
    const next = withCues(c3, context), cue = next.captions.cues.find((cue2) => cue2.id === id);
    if (!cue) throw new Error("Caption no longer exists.");
    for (const key of Object.keys(patch)) if (!["text", "start", "end"].includes(key)) throw new Error(`Cannot edit caption ${key}.`);
    Object.assign(cue, patch);
    Object.assign(cue, range(cue.start, cue.end, context));
    next.captions.cues.sort((a3, b2) => a3.start - b2.start);
    return finish(next, context);
  }
  function addCaption(c3, { text, start, end }, context = {}) {
    const next = withCues(c3, context), r3 = range(start, end, context);
    next.captions.cues.push({ id: uniqueId(next.captions.cues, "caption-"), text, ...r3 });
    next.captions.cues.sort((a3, b2) => a3.start - b2.start);
    return finish(next, context);
  }
  function deleteCaption(c3, id, context = {}) {
    const next = withCues(c3, context);
    next.captions.cues = next.captions.cues.filter((cue) => cue.id !== id);
    return finish(next, context);
  }
  function autoZoomRegenerate(c3, events, record) {
    const next = clone2(c3), manual = next.zoom.regions.filter((z3) => z3.source === "manual");
    const auto = suggestZoomRegions({ events, record, options: zoomOptions(next.zoom) }).filter((z3) => !manual.some((m3) => z3.tStart < m3.tEnd && z3.tEnd > m3.tStart));
    auto.forEach((z3, i3) => {
      z3.id = uniqueId([...manual, ...auto.slice(0, i3)], "auto-");
    });
    next.zoom.regions = [...manual, ...auto].sort((a3, b2) => a3.tStart - b2.tStart);
    return finish(next, { duration: record.durationSec });
  }

  // editor/Timeline.jsx
  var clock = (t3) => `${Math.floor(t3 / 60)}:${(t3 % 60).toFixed(2).padStart(5, "0")}`;
  var clamp6 = (v3, lo, hi) => Math.max(lo, Math.min(hi, v3));
  function Timeline({ state, store, time, setTime, setPlaying, selection, setSelection }) {
    const { composition: c3, plan, project } = state;
    const [scale, setScale] = d2(80), [output, setOutput] = d2(false), [error, setError] = d2("");
    const [splits, setSplits] = d2([]), [speedOpen, setSpeedOpen] = d2(false), [rate, setRate] = d2(2);
    const [depth, setDepth] = d2(1.7), [editing, setEditing] = d2(null), [draft, setDraft] = d2(null);
    const scroller = A2(), lanes = A2(), gesture = A2(null), anchor = A2(null);
    const duration = project?.record.durationSec ?? 0, map = plan?.timemap;
    const sourceT = map ? sourceAt(map, time).t : 0;
    const context = { duration, plan };
    const working = c3 && plan ? { ...c3, zoom: { ...c3.zoom, regions: c3.zoom.regions.length && !c3.zoom.enabled ? c3.zoom.regions : plan.regions } } : c3;
    const shown = draft ?? working;
    const cues = shown?.captions.cues ?? plan?.cues ?? [];
    const steps = project?.events.steps ?? [];
    const clicks = project?.events.clicks ?? [];
    function displayTime(t3) {
      if (!output || !map) return t3;
      const mapped = outputAt(map, t3);
      if (mapped !== null) return mapped;
      const next = map.segments.find((s3) => s3.start >= t3);
      return next?.outputStart ?? map.mainEnd;
    }
    const extent = output ? map?.outputDuration ?? duration : duration;
    const width = Math.max(600, extent * scale);
    const px = (t3) => displayTime(t3) * scale;
    const style = (start, end) => ({ left: px(start), width: Math.max(4, px(end) - px(start)) });
    const fromClient = (x2) => {
      const t3 = clamp6((x2 - lanes.current.getBoundingClientRect().left) / scale, 0, extent);
      return output && map ? sourceAt(map, t3).t : t3;
    };
    const snap = (t3, alt) => {
      t3 = clamp6(t3, 0, duration);
      if (!alt) {
        const points = [sourceT, ...steps.flatMap((s3) => [s3.tStart, s3.tEnd]), ...clicks.map((c4) => c4.t), ...splits];
        const nearest = points.reduce((best, p3) => best === null || Math.abs(px(p3) - px(t3)) < Math.abs(px(best) - px(t3)) ? p3 : best, null);
        if (nearest !== null && Math.abs(px(nearest) - px(t3)) < 8) t3 = nearest;
      }
      return clamp6(snapFrame(t3), 0, duration);
    };
    function commit(operation) {
      try {
        const next = operation();
        store.setComposition(next);
        setError("");
        return true;
      } catch (e3) {
        setError(e3.message);
        return false;
      }
    }
    function seek(t3) {
      setPlaying(false);
      setTime(outputAt(map, t3) ?? displayOutput(t3));
    }
    function displayOutput(t3) {
      return map.segments.find((s3) => s3.start >= t3)?.outputStart ?? map.mainEnd;
    }
    function split() {
      splitAt(c3, sourceT);
      setSplits((values) => [.../* @__PURE__ */ new Set([...values, snapFrame(sourceT)])].sort((a3, b2) => a3 - b2));
      setError("Split boundary added; select either side to cut or change speed.");
    }
    function selectedRange() {
      if (selection?.type === "range") return selection;
      if (selection?.type === "speed") return c3.edits.speeds[selection.index];
      throw new Error("Select a range on the Video track first.");
    }
    function cut() {
      commit(() => {
        const r3 = selectedRange();
        return cutRange(c3, r3.start, r3.end, context);
      });
    }
    function speed(value) {
      commit(() => {
        const r3 = selectedRange();
        const next = setSpeed(c3, r3.start, r3.end, value, context);
        setSelection({ type: "range", start: r3.start, end: r3.end });
        return next;
      });
    }
    function addZoom() {
      const start = snapFrame(sourceT), next = working.zoom.regions.find((z3) => z3.tStart >= start);
      const end = Math.min(duration, start + 2, next?.tStart ?? duration);
      if (commit(() => addZoomRegion(working, { tStart: start, tEnd: end, x: project.events.viewport.width / 2, y: project.events.viewport.height / 2, depth }, context))) {
        const region = store.getState().composition.zoom.regions.find((z3) => z3.tStart === start);
        setSelection({ type: "zoom", id: region.id });
      }
    }
    function addCue() {
      const start = snapFrame(sourceT), next = cues.find((cue) => cue.start >= start);
      if (commit(() => addCaption(c3, { text: "New caption", start, end: Math.min(duration, start + 2, next?.start ?? duration) }, context))) {
        const cue = store.getState().composition.captions.cues.find((cue2) => cue2.start === start);
        setSelection({ type: "caption", id: cue.id });
        setEditing({ id: cue.id, text: cue.text });
      }
    }
    function remove() {
      if (selection?.type === "zoom") commit(() => deleteZoomRegion(working, selection.id, context));
      else if (selection?.type === "caption") commit(() => deleteCaption(c3, selection.id, context));
      else if (selection?.type === "speed") commit(() => clearSpeed(c3, selection.index, context));
      else cut();
    }
    function restore(index = selection?.index) {
      commit(() => restoreRange(c3, index, context));
    }
    function itemRange(sel, base = working) {
      if (sel.type === "zoom") {
        const z3 = base.zoom.regions.find((z4) => z4.id === sel.id);
        return z3 && { start: z3.tStart, end: z3.tEnd };
      }
      if (sel.type === "caption") return (base.captions.cues ?? plan.cues).find((q2) => q2.id === sel.id);
      if (sel.type === "speed") return base.edits.speeds[sel.index];
      return sel.type === "range" ? sel : null;
    }
    function moveItem(base, sel, start, end) {
      if (sel.type === "zoom") return updateZoomRegion(base, sel.id, { tStart: start, tEnd: end }, context);
      if (sel.type === "caption") return setCaption(base, sel.id, { start, end }, context);
      if (sel.type === "speed") {
        const rate2 = base.edits.speeds[sel.index].rate;
        return setSpeed(clearSpeed(base, sel.index, context), start, end, rate2, context);
      }
    }
    function movedSelection(next, sel, start) {
      if (sel.type !== "speed") return sel;
      const index = next.edits.speeds.findIndex((r3) => r3.start <= snapFrame(start) && r3.end > snapFrame(start));
      return index < 0 ? null : { type: "speed", index };
    }
    h2(() => {
      if (!plan) return;
      const keydown = (e3) => {
        if (isTyping(e3.target) || document.querySelector("dialog[open]") || e3.ctrlKey || e3.metaKey || e3.altKey) return;
        const key = e3.key.toLowerCase();
        if (["s", "x", "z", "c", "delete", "backspace"].includes(key)) {
          if (e3.target.closest("button") && ["delete", "backspace"].includes(key)) return;
          e3.preventDefault();
          ({ s: split, x: cut, z: addZoom, c: addCue, delete: remove, backspace: remove })[key]();
        } else if (["ArrowLeft", "ArrowRight"].includes(e3.key) && selection && !e3.target.closest("button")) {
          e3.preventDefault();
          const delta = (e3.key === "ArrowLeft" ? -1 : 1) * (e3.shiftKey ? 10 : 1) / 60;
          const r3 = itemRange(selection);
          if (!r3) return;
          if (selection.type === "range") setSelection({ ...selection, start: clamp6(r3.start + delta, 0, duration - (r3.end - r3.start)), end: clamp6(r3.start + delta, 0, duration - (r3.end - r3.start)) + (r3.end - r3.start) });
          else commit(() => {
            const next = moveItem(working, selection, r3.start + delta, r3.end + delta);
            setSelection(movedSelection(next, selection, r3.start + delta));
            return next;
          });
        }
      };
      addEventListener("keydown", keydown);
      return () => removeEventListener("keydown", keydown);
    });
    h2(() => () => {
      gesture.current?.cleanup?.();
    }, []);
    function drag(e3, sel, edge) {
      if (e3.button !== 0) return;
      e3.preventDefault();
      e3.stopPropagation();
      e3.currentTarget.focus();
      setSelection(sel);
      setPlaying(false);
      const base = working, r3 = itemRange(sel, base), origin = fromClient(e3.clientX);
      let final = null, finalStart = r3.start, moved = false;
      const move = (event) => {
        if (Math.abs(event.clientX - e3.clientX) < 3 && !moved) return;
        moved = true;
        const t3 = fromClient(event.clientX);
        let start = r3.start, end = r3.end;
        if (edge === "start") start = snap(t3, event.altKey);
        else if (edge === "end") end = snap(t3, event.altKey);
        else {
          start = snap(r3.start + t3 - origin, event.altKey);
          end = start + r3.end - r3.start;
        }
        try {
          final = moveItem(base, sel, start, end);
          finalStart = start;
          setDraft(final);
          setError("");
        } catch (err) {
          final = null;
          setDraft(null);
          setError(err.message);
        }
      };
      const cleanup = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", cancel);
      };
      const up = () => {
        cleanup();
        if (final) {
          store.setComposition(final);
          setSelection(movedSelection(final, sel, finalStart));
        }
        setDraft(null);
        gesture.current = null;
      };
      const cancel = () => {
        cleanup();
        setDraft(null);
        gesture.current = null;
      };
      gesture.current?.cleanup?.();
      gesture.current = { cleanup: cancel };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", cancel);
    }
    function selectVideo(e3) {
      if (e3.button !== 0) return;
      e3.preventDefault();
      e3.currentTarget.focus();
      const t3 = snap(fromClient(e3.clientX), e3.altKey), initial = e3.shiftKey && anchor.current !== null ? anchor.current : t3;
      anchor.current = initial;
      const select = (value) => setSelection({ type: "range", start: Math.min(initial, value), end: Math.max(initial, value) });
      const boundaries = [.../* @__PURE__ */ new Set([0, duration, ...steps.flatMap((s3) => [s3.tStart, s3.tEnd]), ...splits])].sort((a3, b2) => a3 - b2);
      if (e3.shiftKey) select(t3);
      else setSelection({ type: "range", start: boundaries.findLast((b2) => b2 <= t3) ?? 0, end: boundaries.find((b2) => b2 > t3) ?? duration });
      seek(t3);
      const move = (ev) => select(snap(fromClient(ev.clientX), ev.altKey));
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        gesture.current = null;
      };
      gesture.current?.cleanup?.();
      gesture.current = { cleanup: up };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
    }
    function rulerDrag(e3) {
      if (e3.button !== 0) return;
      const seekRuler = (x2) => {
        setPlaying(false);
        if (output) setTime(clamp6((x2 - lanes.current.getBoundingClientRect().left) / scale, 0, extent));
        else seek(fromClient(x2));
      };
      e3.preventDefault();
      seekRuler(e3.clientX);
      const move = (ev) => seekRuler(ev.clientX);
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        gesture.current = null;
      };
      gesture.current?.cleanup?.();
      gesture.current = { cleanup: up };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
    }
    function changeScale(value, clientX) {
      const el = scroller.current, next = clamp6(value, 10, 800), rect = el.getBoundingClientRect();
      const offset = clientX === void 0 ? el.clientWidth / 2 : clientX - rect.left;
      const position = (el.scrollLeft + offset) / scale;
      setScale(next);
      requestAnimationFrame(() => {
        el.scrollLeft = position * next - offset;
      });
    }
    h2(() => {
      const el = scroller.current;
      if (!el) return;
      const wheel = (e3) => {
        if (e3.ctrlKey || e3.metaKey) {
          e3.preventDefault();
          changeScale(scale * Math.exp(-e3.deltaY * 5e-3), e3.clientX);
        } else if (e3.shiftKey || Math.abs(e3.deltaX) > 0) {
          e3.preventDefault();
          el.scrollLeft += e3.deltaX || e3.deltaY;
        }
      };
      el.addEventListener("wheel", wheel, { passive: false });
      return () => el.removeEventListener("wheel", wheel);
    }, [scale, plan]);
    if (!c3 || !plan) return /* @__PURE__ */ k("p", { class: "empty" }, "Load a recording to edit its timeline.");
    const selectedZoom = shown.zoom.regions.find((z3) => selection?.type === "zoom" && z3.id === selection.id);
    const ticks = [];
    const tickStep = [0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600].find((n2) => n2 * scale >= 65) ?? 600;
    for (let t3 = 0; t3 <= extent; t3 += tickStep) ticks.push(t3);
    function block(sel, start, end, label, kind) {
      const active = selection?.type === sel.type && (sel.id ? selection.id === sel.id : selection.index === sel.index);
      return /* @__PURE__ */ k(
        "div",
        {
          key: sel.id ?? sel.index,
          role: "button",
          tabIndex: "0",
          "aria-label": `${kind}: ${label}, ${clock(start)} to ${clock(end)}; arrow keys move`,
          "aria-pressed": active,
          class: `timeline-block ${kind} ${active ? "selected" : ""}`,
          style: style(start, end),
          onPointerDown: (e3) => drag(e3, sel),
          onFocus: () => setSelection(sel),
          onClick: () => setSelection(sel),
          onDblClick: () => {
            if (sel.type === "caption") setEditing({ id: sel.id, text: label });
          },
          onKeyDown: (e3) => {
            if (e3.key === "Enter") {
              setSelection(sel);
              if (sel.type === "caption") setEditing({ id: sel.id, text: label });
            }
          }
        },
        /* @__PURE__ */ k("button", { class: "edge start", "aria-label": `Resize ${kind} start`, onPointerDown: (e3) => drag(e3, sel, "start"), onKeyDown: (e3) => resizeKey(e3, sel, "start") }),
        /* @__PURE__ */ k("span", null, label),
        /* @__PURE__ */ k("button", { class: "edge end", "aria-label": `Resize ${kind} end`, onPointerDown: (e3) => drag(e3, sel, "end"), onKeyDown: (e3) => resizeKey(e3, sel, "end") })
      );
    }
    function resizeKey(e3, sel, edge) {
      if (!["ArrowLeft", "ArrowRight"].includes(e3.key)) return;
      e3.preventDefault();
      e3.stopPropagation();
      const r3 = itemRange(sel), delta = (e3.key === "ArrowLeft" ? -1 : 1) * (e3.shiftKey ? 10 : 1) / 60;
      commit(() => {
        const start = r3.start + (edge === "start" ? delta : 0);
        const next = moveItem(working, sel, start, r3.end + (edge === "end" ? delta : 0));
        setSelection(movedSelection(next, sel, start));
        return next;
      });
    }
    return /* @__PURE__ */ k("div", { class: "timeline-editor" }, /* @__PURE__ */ k("div", { class: "timeline-toolbar", role: "toolbar", "aria-label": "Timeline edits" }, /* @__PURE__ */ k("strong", null, "TIMELINE"), /* @__PURE__ */ k("button", { onClick: split, title: "Split at playhead (S)" }, "Split"), /* @__PURE__ */ k("button", { onClick: remove, title: "Cut range or delete selection (Delete / X)" }, "Delete / Cut"), /* @__PURE__ */ k("div", { class: "speed-menu" }, /* @__PURE__ */ k("button", { "aria-expanded": speedOpen, onClick: () => setSpeedOpen(!speedOpen) }, "Speed"), speedOpen && /* @__PURE__ */ k("div", { class: "speed-popover" }, /* @__PURE__ */ k("div", null, [0.5, 1, 1.5, 2, 4, 8].map((n2) => /* @__PURE__ */ k("button", { onClick: () => speed(n2) }, n2, "x"))), /* @__PURE__ */ k("label", null, "Custom speed ", /* @__PURE__ */ k("input", { type: "number", min: "0.25", max: "8", step: "0.05", value: rate, onInput: (e3) => setRate(+e3.currentTarget.value) }), " x"), /* @__PURE__ */ k("button", { onClick: () => speed(rate) }, "Apply"))), /* @__PURE__ */ k("button", { onClick: addZoom, title: "Add zoom region (Z)" }, "+ Zoom"), /* @__PURE__ */ k("label", null, "Depth ", /* @__PURE__ */ k("input", { "aria-label": "Zoom depth", type: "number", min: "1.05", max: "4", step: "0.05", value: selectedZoom?.depth ?? depth, onInput: (e3) => {
      const value = +e3.currentTarget.value;
      setDepth(value);
      if (selectedZoom) commit(() => updateZoomRegion(working, selectedZoom.id, { depth: value }, context));
    } }), " x"), /* @__PURE__ */ k("button", { onClick: addCue, title: "Add caption (C)" }, "+ Caption"), /* @__PURE__ */ k("button", { disabled: selection?.type !== "trim", onClick: () => restore() }, "Restore"), /* @__PURE__ */ k("button", { title: "Regenerate automatic zooms; preserve manual regions", onClick: () => commit(() => autoZoomRegenerate(working, project.events, project.record)) }, "Auto zoom"), /* @__PURE__ */ k("label", { class: "time-mode" }, /* @__PURE__ */ k("input", { type: "checkbox", checked: output, onChange: (e3) => setOutput(e3.currentTarget.checked) }), " Output time"), /* @__PURE__ */ k("button", { "aria-label": "Zoom timeline out", onClick: () => changeScale(scale / 1.4) }, "\u2212"), /* @__PURE__ */ k("button", { "aria-label": "Zoom timeline in", onClick: () => changeScale(scale * 1.4) }, "+")), /* @__PURE__ */ k("div", { class: "timeline-summary" }, /* @__PURE__ */ k("strong", null, clock(map.outputDuration), " output"), /* @__PURE__ */ k("span", null, clock(c3.edits.trims.reduce((n2, r3) => n2 + r3.end - r3.start, 0)), " removed \xB7 ", c3.edits.trims.length, " cuts"), /* @__PURE__ */ k("span", null, output ? "OUTPUT" : "SOURCE", " TIME \xB7 Drag to select \xB7 Alt disables snapping")), error && /* @__PURE__ */ k("p", { role: "status", class: "timeline-message" }, error), selectedZoom && /* @__PURE__ */ k("p", { class: "timeline-message" }, "Click the preview to set this region\u2019s focus at the playhead."), /* @__PURE__ */ k("div", { class: "timeline-grid" }, /* @__PURE__ */ k("div", { class: "track-labels", "aria-hidden": "true" }, ["Time", "Video", "Speed", "Zoom", "Captions", "Cursor"].map((label) => /* @__PURE__ */ k("div", null, label))), /* @__PURE__ */ k("div", { class: "timeline-scroll", ref: scroller, tabIndex: "0", "aria-label": "Timeline; scroll horizontally to pan" }, /* @__PURE__ */ k("div", { class: "timeline-lanes", ref: lanes, style: { width } }, /* @__PURE__ */ k(
      "div",
      {
        class: "timeline-ruler",
        role: "slider",
        tabIndex: "0",
        "aria-label": `Playhead in ${output ? "output" : "source"} time`,
        "aria-valuemin": "0",
        "aria-valuemax": extent,
        "aria-valuenow": output ? time : sourceT,
        onPointerDown: rulerDrag,
        onKeyDown: (e3) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e3.key)) {
            e3.preventDefault();
            e3.stopPropagation();
            const next = e3.key === "Home" ? 0 : e3.key === "End" ? extent : clamp6((output ? time : sourceT) + (e3.key === "ArrowLeft" ? -1 : 1) * (e3.shiftKey ? 10 : 1) / 60, 0, extent);
            if (output) {
              setPlaying(false);
              setTime(next);
            } else seek(next);
          }
        }
      },
      ticks.map((t3) => /* @__PURE__ */ k("span", { style: { left: t3 * scale } }, clock(t3)))
    ), /* @__PURE__ */ k("div", { class: "timeline-track video-track", tabIndex: "0", "aria-label": "Video; drag or shift click to select a source range", onPointerDown: selectVideo }, steps.map((step) => /* @__PURE__ */ k(
      "div",
      {
        class: "step-block",
        role: "button",
        tabIndex: "0",
        "aria-label": `Select video step ${step.id}`,
        style: style(step.tStart, step.tEnd),
        onKeyDown: (e3) => {
          if (e3.key === "Enter" || e3.key === " ") {
            e3.preventDefault();
            e3.stopPropagation();
            setSelection({ type: "range", start: step.tStart, end: step.tEnd });
            seek(step.tStart);
          }
        }
      },
      project.storyboard.steps.find((s3) => s3.id === step.id)?.name ?? project.storyboard.steps.find((s3) => s3.id === step.id)?.title ?? project.storyboard.steps.find((s3) => s3.id === step.id)?.caption ?? step.id
    )), splits.map((t3) => /* @__PURE__ */ k("i", { class: "split-line", style: { left: px(t3) } })), c3.edits.trims.map((r3, index) => /* @__PURE__ */ k("button", { class: `trim-block ${selection?.type === "trim" && selection.index === index ? "selected" : ""}`, style: style(r3.start, r3.end), "aria-label": `Removed ${clock(r3.start)} to ${clock(r3.end)}`, onPointerDown: (e3) => e3.stopPropagation(), onClick: () => setSelection({ type: "trim", index }) }, "Removed")), selection?.type === "range" && /* @__PURE__ */ k("div", { class: "range-selection", style: style(selection.start, selection.end) })), /* @__PURE__ */ k("div", { class: "timeline-track" }, shown.edits.speeds.map((r3, index) => block({ type: "speed", index }, r3.start, r3.end, `${r3.rate}x`, "speed"))), /* @__PURE__ */ k("div", { class: "timeline-track" }, shown.zoom.regions.map((z3) => block({ type: "zoom", id: z3.id }, z3.tStart, z3.tEnd, `${zoomDepth(z3.depth)}x \xB7 ${z3.source}`, "zoom"))), /* @__PURE__ */ k("div", { class: "timeline-track" }, cues.map((cue) => block({ type: "caption", id: cue.id }, cue.start, cue.end, cue.text, "caption"))), /* @__PURE__ */ k("div", { class: "timeline-track cursor-track" }, clicks.map((click) => /* @__PURE__ */ k("span", { class: "click-marker", style: { left: px(click.t) }, title: `Click at ${clock(click.t)}` }))), /* @__PURE__ */ k("div", { class: "timeline-playhead", style: { left: (output ? time : sourceT) * scale } })))), editing && /* @__PURE__ */ k("form", { class: "caption-inline", onSubmit: (e3) => {
      e3.preventDefault();
      if (commit(() => setCaption(c3, editing.id, { text: editing.text }, context))) setEditing(null);
    } }, /* @__PURE__ */ k("label", null, "Caption text ", /* @__PURE__ */ k("input", { autoFocus: true, maxLength: "140", value: editing.text, onInput: (e3) => setEditing({ ...editing, text: e3.currentTarget.value }), onKeyDown: (e3) => {
      if (e3.key === "Escape") setEditing(null);
    } })), /* @__PURE__ */ k("button", { type: "submit" }, "Save caption"), /* @__PURE__ */ k("button", { type: "button", onClick: () => setEditing(null) }, "Cancel")), !!c3.edits.trims.length && /* @__PURE__ */ k("details", { class: "removed-list" }, /* @__PURE__ */ k("summary", null, "Removed (", c3.edits.trims.length, ")"), c3.edits.trims.map((r3, index) => /* @__PURE__ */ k("div", null, /* @__PURE__ */ k("span", null, clock(r3.start), " \u2013 ", clock(r3.end), " \xB7 ", clock(r3.end - r3.start)), /* @__PURE__ */ k("button", { onClick: () => restore(index) }, "Restore")))));
  }

  // editor/App.jsx
  function Shortcuts({ onClose }) {
    const dialog = A2();
    h2(() => {
      dialog.current.showModal();
    }, []);
    return /* @__PURE__ */ k("dialog", { ref: dialog, "aria-labelledby": "shortcuts-title", onCancel: onClose }, /* @__PURE__ */ k("div", { class: "dialog-heading" }, /* @__PURE__ */ k("h2", { id: "shortcuts-title" }, "Keyboard shortcuts"), /* @__PURE__ */ k("button", { onClick: onClose, "aria-label": "Close shortcuts" }, "\xD7")), /* @__PURE__ */ k("dl", { class: "shortcuts" }, [["Space", "Play / pause"], [", / .", "Previous / next frame"], ["\u2318 / Ctrl Z", "Undo"], ["\u2318 / Ctrl Shift Z", "Redo"], ["S / X", "Split / cut range"], ["Z / C", "Add zoom / caption"], ["Delete", "Delete selected item"], ["\u2190 / \u2192", "Nudge one frame (Shift: ten)"], ["?", "Show shortcuts"]].map(([key, action]) => /* @__PURE__ */ k("div", null, /* @__PURE__ */ k("dt", null, /* @__PURE__ */ k("kbd", null, key)), /* @__PURE__ */ k("dd", null, action)))));
  }
  function App() {
    const [store] = d2(createEditorStore), [state, setState] = d2(store.getState());
    const [selection, setSelection] = d2(null);
    const [provider, setProvider] = d2(null), [mediaError, setMediaError] = d2("");
    const [time, setTime] = d2(0), [playing, setPlaying] = d2(false);
    const [shortcuts, setShortcuts] = d2(false), [toast, setToast] = d2("");
    h2(() => {
      let active = true, opened;
      let composition = store.getState().composition;
      const unsubscribe = store.subscribe((next) => {
        if (next.composition !== composition) setPlaying(false);
        composition = next.composition;
        setState(next);
      });
      store.load();
      openFrames().then((frames) => {
        opened = frames;
        if (!active) {
          frames.close();
          return;
        }
        setProvider(frames);
        store.setSourceSize(frames.sourceSize);
      }).catch((e3) => {
        if (active) setMediaError(e3.message);
      });
      return () => {
        active = false;
        opened?.close();
        unsubscribe();
        store.dispose();
      };
    }, [store]);
    h2(() => {
      const beforeUnload = (event) => {
        if (store.getState().dirty) {
          event.preventDefault();
          event.returnValue = "";
        }
      };
      addEventListener("beforeunload", beforeUnload);
      return () => removeEventListener("beforeunload", beforeUnload);
    }, [store]);
    h2(() => {
      const keydown = (event) => {
        if (isTyping(event.target) || document.querySelector("dialog[open]")) return;
        const key = event.key.toLowerCase(), command = event.metaKey || event.ctrlKey;
        if (command && key === "z") {
          event.preventDefault();
          if (event.shiftKey) store.redo();
          else store.undo();
        } else if (!command && !event.altKey) {
          if (event.key === " " && !event.target.closest("button, a")) {
            event.preventDefault();
            if (state.plan) setPlaying((value) => !value);
          } else if ([",", "."].includes(key)) {
            event.preventDefault();
            setPlaying(false);
            setTime((value) => Math.max(0, Math.min(state.plan?.timemap.outputDuration ?? 0, value + (key === "," ? -1 : 1) / (state.plan?.output.fps ?? 30))));
          } else if (event.key === "?") {
            event.preventDefault();
            setShortcuts(true);
          }
        }
      };
      addEventListener("keydown", keydown);
      return () => removeEventListener("keydown", keydown);
    }, [state.plan, store]);
    h2(() => {
      if (toast) {
        const timer = setTimeout(() => setToast(""), 2200);
        return () => clearTimeout(timer);
      }
    }, [toast]);
    return /* @__PURE__ */ k("div", { class: "editor-shell" }, /* @__PURE__ */ k(TopBar, { state, store }), /* @__PURE__ */ k("div", { class: "workspace" }, /* @__PURE__ */ k("div", { class: "viewer" }, /* @__PURE__ */ k("div", { class: "viewer-heading" }, /* @__PURE__ */ k("span", null, "PREVIEW"), /* @__PURE__ */ k("button", { onClick: () => setShortcuts(true), "aria-label": "Keyboard shortcuts" }, "?")), (state.error || mediaError) && /* @__PURE__ */ k("p", { class: "error app-error", role: "alert" }, mediaError || state.error), /* @__PURE__ */ k(
      Preview,
      {
        plan: state.plan,
        provider,
        time,
        setTime,
        playing,
        setPlaying,
        focus: selection?.type === "zoom" ? state.plan?.regions.find((z3) => z3.id === selection.id) : null,
        onPick: (point) => {
          if (selection?.type !== "zoom" || !state.plan) return;
          try {
            const c3 = { ...state.composition, zoom: { ...state.composition.zoom, regions: state.plan.regions } };
            store.setComposition(setZoomFocus(c3, selection.id, sourceAt(state.plan.timemap, time).t, point.x, point.y, { duration: state.project.record.durationSec }));
          } catch (e3) {
            setToast(e3.message);
          }
        }
      }
    )), state.composition && /* @__PURE__ */ k(Settings, { state, store })), /* @__PURE__ */ k("section", { id: "timeline-root", "aria-label": "Timeline" }, /* @__PURE__ */ k(Timeline, { state, store, time, setTime, setPlaying, selection, setSelection })), toast && /* @__PURE__ */ k("div", { class: "toast", role: "status" }, toast), shortcuts && /* @__PURE__ */ k(Shortcuts, { onClose: () => setShortcuts(false) }));
  }

  // editor/main.jsx
  R(/* @__PURE__ */ k(App, null), document.getElementById("app"));
})();
/*! Bundled license information:

mediabunny/dist/modules/src/misc.js:
mediabunny/dist/modules/src/logging.js:
mediabunny/dist/modules/src/metadata.js:
mediabunny/dist/modules/shared/bitstream.js:
mediabunny/dist/modules/shared/aac-misc.js:
mediabunny/dist/modules/shared/ac3-misc.js:
mediabunny/dist/modules/src/codec-data.js:
mediabunny/dist/modules/src/codec.js:
mediabunny/dist/modules/src/demuxer.js:
mediabunny/dist/modules/src/packet.js:
mediabunny/dist/modules/src/isobmff/isobmff-misc.js:
mediabunny/dist/modules/src/isobmff/isobmff-reader.js:
mediabunny/dist/modules/src/aes.js:
mediabunny/dist/modules/src/isobmff/isobmff-demuxer.js:
mediabunny/dist/modules/src/source.js:
mediabunny/dist/modules/src/input-format.js:
mediabunny/dist/modules/src/sample.js:
mediabunny/dist/modules/src/custom-coder.js:
mediabunny/dist/modules/src/media-sink.js:
mediabunny/dist/modules/src/input-track.js:
mediabunny/dist/modules/src/input.js:
mediabunny/dist/modules/src/reader.js:
mediabunny/dist/modules/src/index.js:
  (*!
   * Copyright (c) 2026-present, Vanilagy and contributors
   *
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at https://mozilla.org/MPL/2.0/.
   *)
*/
