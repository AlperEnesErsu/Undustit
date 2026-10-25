"""Site text tool. All visible text lives in assets/metin/<dil>.js as key -> HTML; pages mark where it goes.

  python tools/metin.py etiketle   tag every untagged text block in the pages with data-t / data-ta and add
                                   the Turkish found there to assets/metin/tr.js (keys that exist are kept)
  python tools/metin.py yaz        write tr.js back into the pages' HTML, so the static Turkish (what search
                                   engines and no-JS visitors read) matches the dictionary after an edit
  python tools/metin.py denetle    list keys missing from en.js, keys no page or script uses, empty values

Keys are <page>.<tag>.<n>; text the scripts build (ud.js, page scripts) uses hand-named keys such as ud.nav.ideas.
"""
import json, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = {'index.html': 'anasayfa', 'fikir/index.html': 'fikir', 'fikirler/index.html': 'fikirler', 'nasil/index.html': 'nasil',
         'vakalar/index.html': 'vakalar', 'vaka-01/index.html': 'vaka', 'hikaye/index.html': 'hikaye', 'stiller/index.html': 'stiller',
         '404.html': 'yok', 'vaka/index.html': 'vakasayfa'}
UNIT = {'title', 'h1', 'h2', 'h3', 'p', 'li', 'dt', 'dd', 'b', 'strong', 'span', 'a', 'button', 'label', 'figcaption', 'q', 'th', 'td',
        'small', 'text', 'summary', 'option', 'div', 'em', 'i', 'tspan', 'caption'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
ATTRS = ('aria-label', 'placeholder', 'title', 'alt')
META = {'description', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description'}
LETTER = re.compile(r'[A-Za-zÇĞİÖŞÜçğıöşüÂâÎî]')


def path(p): return os.path.join(ROOT, p)
def read(p): return open(path(p), encoding='utf-8').read()
def write(p, s): open(path(p), 'w', encoding='utf-8', newline='').write(s)


def load(lang):
    p = f'assets/metin/{lang}.js'
    if not os.path.exists(path(p)): return {}
    s = read(p)
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def save(lang, d):
    head = {'tr': 'Türkçe', 'en': 'English'}[lang]
    body = json.dumps(d, ensure_ascii=False, indent=1)
    write(f'assets/metin/{lang}.js', f'/* Undustit site text, {head}. Edit values only; keys are where the text sits.\n'
          f'   The in-page editor (?duzenle=1) downloads this same file. */\nUD_METIN.ekle(\'{lang}\', {body});\n')


class Scan(HTMLParser):
    """Records each element's source span: start tag, inner start, inner end, plus direct-text flags."""
    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.lines = [0]
        for m in re.finditer('\n', src): self.lines.append(m.end())
        self.stack, self.nodes, self.skip = [], [], 0

    def off(self): l, c = self.getpos(); return self.lines[l - 1] + c

    def handle_starttag(self, tag, attrs):
        o = self.off(); raw = self.get_starttag_text()
        node = {'tag': tag, 'attrs': dict(attrs), 'start': o, 'inner': o + len(raw), 'end': None, 'text': False,
                'parent': self.stack[-1] if self.stack else None, 'kids': []}
        if node['parent']: node['parent']['kids'].append(node)
        self.nodes.append(node)
        if tag in ('script', 'style'): self.skip += 1
        if tag not in VOID: self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        o = self.off(); raw = self.get_starttag_text()
        node = {'tag': tag, 'attrs': dict(attrs), 'start': o, 'inner': o + len(raw), 'end': o + len(raw), 'text': False,
                'parent': self.stack[-1] if self.stack else None, 'kids': []}
        self.nodes.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]['tag'] == tag:
                for n in self.stack[i:]: n['end'] = self.off()
                del self.stack[i:]
                break
        if tag in ('script', 'style'): self.skip -= 1

    def handle_data(self, data):
        if self.stack and not self.skip and LETTER.search(data): self.stack[-1]['text'] = True

    def handle_entityref(self, name):
        if self.stack and not self.skip: self.stack[-1]['text'] = True


def scan(src):
    s = Scan(src); s.feed(src); s.close()
    return s.nodes


def inside(n, pred):
    p = n['parent']
    while p:
        if pred(p): return True
        p = p['parent']
    return False


def etiketle():
    tr = load('tr')
    for file, page in PAGES.items():
        src = read(file)
        if 'data-t=' in src:
            print('skip (already tagged)', file); continue
        nodes = scan(src)
        edits, count = [], {}

        def key(tag):
            count[tag] = count.get(tag, 0) + 1
            return f'{page}.{tag}.{count[tag]}'

        units = []
        for n in nodes:
            if n['end'] is None or n['tag'] not in UNIT or not n['text']: continue
            if inside(n, lambda p: p.get('_unit') or p['tag'] in ('script', 'style')): continue
            if n['attrs'].get('lang') == 'en' or 'brand' in (n['attrs'].get('class') or ''): continue
            n['_unit'] = True; units.append(n)
        for n in units:
            inner = src[n['inner']:n['end']]
            k = key(n['tag'])
            if '<svg' in inner and n['tag'] != 'text':
                # icon after the words: only the words become text, the icon stays in the page
                cut = inner.index('<svg'); words = inner[:cut]; lead = len(words) - len(words.lstrip()); trail = len(words.rstrip())
                edits.append((n['inner'] + trail, '</span>'))
                edits.append((n['inner'] + lead, f'<span data-t="{k}">'))
                tr.setdefault(k, words.strip())
            else:
                edits.append((n['inner'] - 1, f' data-t="{k}"'))
                tr.setdefault(k, ' '.join(inner.split()) if '\n' in inner else inner)
        for n in nodes:
            pairs = []
            if n['tag'] == 'meta':
                name = n['attrs'].get('name') or n['attrs'].get('property')
                if name in META: pairs.append(('content', n['attrs'].get('content') or ''))
            else:
                for a in ATTRS:
                    v = n['attrs'].get(a)
                    if v and LETTER.search(v) and '${' not in v: pairs.append((a, v))
            if not pairs: continue
            spec = []
            for a, v in pairs:
                k = key('attr'); tr.setdefault(k, v); spec.append(f'{a}:{k}')
            close = n['inner'] - (2 if src[n['inner'] - 2:n['inner']] == '/>' else 1)
            edits.append((close, f' data-ta="{";".join(spec)}"'))
        for at, ins in sorted(edits, key=lambda e: e[0], reverse=True):
            src = src[:at] + ins + src[at:]
        write(file, src)
        print('tagged', file, sum(count.values()))
    save('tr', tr)


def yaz():
    tr = load('tr')
    for file in PAGES:
        src = read(file); nodes = scan(src); edits = []
        for n in nodes:
            k = n['attrs'].get('data-t')
            if k and k in tr and n['end'] is not None: edits.append((n['inner'], n['end'], tr[k]))
            spec = n['attrs'].get('data-ta')
            if spec:
                raw = src[n['start']:n['inner']]; new = raw
                for part in spec.split(';'):
                    a, k = part.split(':')
                    if k in tr: new = re.sub(rf'(\s{re.escape(a)}=")[^"]*(")', lambda m: m.group(1) + tr[k].replace('"', '&quot;') + m.group(2), new, count=1)
                if new != raw: edits.append((n['start'], n['inner'], None, new))
        for e in sorted(edits, key=lambda e: e[0], reverse=True):
            if len(e) == 3: src = src[:e[0]] + e[2] + src[e[1]:]
            else: src = src[:e[0]] + e[3] + src[e[1]:]
        write(file, src)
    print('pages updated from tr.js')


def denetle():
    tr, en = load('tr'), load('en')
    used = set()
    for file in PAGES:
        s = read(file)
        used |= set(re.findall(r'data-t="([^"]+)"', s))
        for spec in re.findall(r'data-ta="([^"]+)"', s): used |= {p.split(':')[1] for p in spec.split(';')}
        used |= set(re.findall(r"\bT\('([^']+)'", s))
    used |= set(re.findall(r"\bT\('([^']+)'", read('assets/ud.js')))
    # keys built in code ('ud.akis.adim' + n, 'ud.not.' + kind) count as prefixes
    pre = {k for k in used if k.endswith(('.', 'adim', 'basla')) or k == 'key'}
    used -= pre
    used |= {k for k in tr if any(k.startswith(p) for p in pre if p != 'key') or k.startswith(('ud.kat.', 'ud.ornek.'))}
    print('missing in en:', sorted(k for k in tr if k not in en) or 'none')
    print('only in en:', sorted(k for k in en if k not in tr) or 'none')
    print('unused:', sorted(k for k in tr if k not in used and not k.startswith('ud.dyn')) or 'none')
    print('used but missing in tr:', sorted(k for k in used if k not in tr) or 'none')
    print('empty:', sorted(k for d in (tr, en) for k, v in d.items() if not str(v).strip()) or 'none')


if __name__ == '__main__':
    {'etiketle': etiketle, 'yaz': yaz, 'denetle': denetle}[sys.argv[1] if len(sys.argv) > 1 else 'denetle']()
