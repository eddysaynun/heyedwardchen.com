"""Run against a built site: python3 scripts/test-blog-ui.py [base URL].
Uses an already-installed Playwright, no project dependency changes.
Evidence is written under Hermes scratch (override BLOG_UI_EVIDENCE).
"""
import json, os, sys, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4327'
OUT = Path(os.environ.get('BLOG_UI_EVIDENCE', '/Users/edward/.hermes/cache/scratch/blog-ui-evidence'))
OUT.mkdir(parents=True, exist_ok=True)
results = {'base': BASE, 'checks': [], 'screenshots': [], 'pageErrors': []}
def record(name, **data):
    results['checks'].append({'name': name, **data})
def shot(page, name):
    path = OUT / (name + '.png'); page.screenshot(path=str(path)); results['screenshots'].append(str(path))
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    context = browser.new_context(viewport={'width':1600,'height':1000}, color_scheme='light', reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda e: results['pageErrors'].append(str(e)))
    paths = {'mcp':'/blog/mcp-protocol-mechanisms/', 'moe':'/blog/moe-routing-load-balancing/', 'list':'/blog/', 'ordinary':'/blog/astro-blog-setup/'}
    try:
        for name, path in paths.items():
            assert page.goto(BASE+path, wait_until='domcontentloaded').status == 200
            page.wait_for_timeout(600)
            if name != 'list':
                source=Path('src/content/blog')/(path.strip('/').split('/')[-1]+'.md')
                node_script="import {readFileSync} from 'node:fs';import {remark} from 'remark';const t=remark().parse(readFileSync(process.argv[1],'utf8'));const codes=[];function walk(n){if(n.type==='code')codes.push(n.value);n.children?.forEach(walk)}walk(t);console.log(JSON.stringify(codes));"
                expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',node_script,str(source)],text=True))
                actual=page.locator('.markdown-body pre code').all_text_contents()
                assert [c.rstrip('\n') for c in actual]==[c.rstrip('\n') for c in expected], name+' rendered code differs'
                record('rendered-code-preserved',page=name,blocks=len(actual))
            for width in [1600,1560,1440,1024,768,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width>768 else 844})
                page.wait_for_timeout(150)
                geom = page.evaluate('''() => {
                  const rect = s => {const e=document.querySelector(s); if(!e || getComputedStyle(e).display==='none')return null; const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width};};
                  return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,main:rect('.markdown-body')||rect('#posts-list'),toc:rect('.article-toc'),timeline:rect('.timeline-side'),overflow:[...document.querySelectorAll('main pre,.markdown-body img,main table,main .post')].filter(e=>{const r=e.getBoundingClientRect();return getComputedStyle(e).visibility !== 'hidden' && r.width && (r.left < -1 || r.right>innerWidth+1)}).map(e=>e.tagName)};
                }''')
                assert geom['scrollWidth'] <= width, geom
                assert not geom['overflow'], geom
                if width >= 1560:
                    rail = geom['timeline'] if name == 'list' else geom['toc']
                    assert rail, geom
                    assert (rail['left'] >= geom['main']['right']+10 if name=='list' else rail['right']+10 <= geom['main']['left']), geom
                    assert geom['main']['width'] == 1064, geom
                else:
                    assert not geom['toc'] and not geom['timeline'], geom
                record('responsive', page=name, width=width, geometry=geom)
                if width in [1600,390]: shot(page, name+'-'+str(width))
            assert page.locator('.article-toc').count() == (0 if name == 'list' else 1)
            if name == 'ordinary': assert page.locator('.citation').count()==0
        page.set_viewport_size({'width':1600,'height':1000})
        page.goto(BASE+paths['mcp'], wait_until='domcontentloaded')
        assert page.locator('.reference-item').count()==34
        integrity=page.evaluate('''() => { const cites=[...document.querySelectorAll('.citation a')]; return {count:cites.length, unique:new Set(cites.map(a=>a.id)).size, broken:cites.filter(a=>!document.querySelector(a.getAttribute('href'))).length, backs:document.querySelectorAll('.reference-backlink').length, codeCites:document.querySelectorAll('code .citation').length}; }''')
        assert integrity['count']==integrity['unique']==integrity['backs'] and integrity['broken']==integrity['codeCites']==0, integrity
        first=page.locator('.citation a').first; target=first.get_attribute('href'); origin=first.get_attribute('id')
        first.click(); page.wait_for_timeout(100)
        assert page.evaluate('location.hash')==target
        assert page.locator(target).bounding_box()['y']>=70
        shot(page,'mcp-reference-target')
        page.locator(target+' .reference-backlink').first.click()
        assert page.evaluate('location.hash')=='#'+origin
        assert page.locator('#'+origin).bounding_box()['y']>=70
        page.wait_for_timeout(150)
        shot(page,'mcp-citation-return')
        repeated=page.locator('.citation a[href="#reference-1"]').nth(1).get_attribute('id')
        for width in [1600,390]:
            page.set_viewport_size({'width':width,'height':1000 if width==1600 else 844})
            for selector in ['.citation a[href="#reference-2"]', '#'+repeated]:
                anchor=page.locator(selector).first
                origin_id=anchor.get_attribute('id'); href=anchor.get_attribute('href')
                anchor.click(); page.wait_for_timeout(100)
                assert page.evaluate('location.hash')==href
                page.locator(href+' a[href="#'+origin_id+'"]').click(); page.wait_for_timeout(100)
                assert page.evaluate('location.hash')=='#'+origin_id
                assert page.locator('#'+origin_id).bounding_box()['y']>=70
            record('citation-roundtrip',width=width,checks=['second-source','repeated-source-distinct-return'])
        page.set_viewport_size({'width':1600,'height':1000})
        record('citations', sources=34, **integrity)
        for selector in ['.tweaks-toggle','#back-to-top']:
            button=page.locator(selector); button.hover()
            style=button.evaluate('(e)=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,border:s.borderTopWidth,shadow:s.boxShadow,radius:s.borderRadius,width:e.offsetWidth,height:e.offsetHeight,label:e.getAttribute("aria-label")}}')
            assert style['bg']=='rgba(0, 0, 0, 0)' and style['border']=='0px' and style['shadow']=='none' and style['radius']=='0px', style
            assert style['width']>=44 and style['height']>=44 and style['label']
            button.focus(); page.keyboard.press('Tab'); page.keyboard.press('Shift+Tab')
            assert button.evaluate('e=>getComputedStyle(e).outlineStyle')!='none'
            record('icon-only', selector=selector, style=style)
        page.locator('.tweaks-toggle').click(); assert page.locator('.tweaks-menu').evaluate('e=>!e.inert')
        page.keyboard.press('Escape'); assert page.locator('.tweaks-menu').evaluate('e=>e.inert')
        page.locator('#back-to-top').click(); page.wait_for_timeout(1000); assert page.evaluate('scrollY')==0
        for mobile in [False,True]:
            ctx = browser.new_context(viewport={'width':390 if mobile else 1600,'height':844 if mobile else 1000}, is_mobile=mobile, has_touch=mobile, color_scheme='light', reduced_motion='reduce')
            pg=ctx.new_page(); pg.on('pageerror', lambda e: results['pageErrors'].append(str(e)))
            pg.goto(BASE+paths['moe'], wait_until='domcontentloaded')
            image=pg.locator('.markdown-body img.lightbox-enabled').first; trigger=pg.locator('.image-zoom-trigger').first
            image.scroll_into_view_if_needed(); pg.wait_for_function('document.querySelector(".markdown-body img").complete')
            assert image.evaluate('e=>e.naturalWidth>0'), 'Real article image failed to load'
            original=pg.locator('.image-zoom-trigger').count()
            pg.evaluate("document.dispatchEvent(new Event('astro:page-load'));document.dispatchEvent(new Event('astro:page-load'))")
            assert pg.locator('.image-zoom-trigger').count()==original
            if mobile: trigger.tap()
            else: image.dblclick()
            assert pg.locator('dialog').evaluate('e=>e.open')
            assert pg.evaluate('document.body.style.overflow')=='hidden'
            assert pg.locator('.lightbox-close').evaluate('e=>document.activeElement===e')
            pg.keyboard.press('Tab'); assert pg.locator('.lightbox-zoom').evaluate('e=>document.activeElement===e')
            pg.keyboard.press('Tab'); assert pg.locator('.lightbox-close').evaluate('e=>document.activeElement===e')
            pg.keyboard.press('Shift+Tab'); assert pg.locator('.lightbox-zoom').evaluate('e=>document.activeElement===e')
            pg.keyboard.press('Tab')
            pg.locator('.lightbox-zoom').click()
            assert pg.locator('.lightbox-zoom').get_attribute('aria-pressed')=='true'
            assert pg.locator('.lightbox-image').evaluate('e=>e.getBoundingClientRect().width===e.naturalWidth')
            if mobile:
                shot(pg, 'moe-lightbox-mobile-native-size')
                assert pg.locator('.lightbox-close').bounding_box()['x'] < 390
                background_y=pg.evaluate('window.scrollY')
                pg.locator('dialog').evaluate('e=>{e.scrollLeft=120;e.scrollTop=100}')
                assert pg.locator('dialog').evaluate('e=>e.scrollLeft')==120
                assert pg.evaluate('window.scrollY')==background_y
            pg.locator('.lightbox-zoom').click()
            assert pg.locator('.lightbox-zoom').get_attribute('aria-pressed')=='false'
            shot(pg,'moe-lightbox-'+('mobile' if mobile else 'desktop'))
            pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
            assert not pg.locator('dialog').evaluate('e=>e.open')
            assert pg.evaluate('document.body.style.overflow')!='hidden'
            assert trigger.evaluate('e=>document.activeElement===e')
            trigger.press('Enter'); assert pg.locator('dialog').evaluate('e=>e.open')
            pg.locator('.lightbox-close').click(); pg.wait_for_timeout(100)
            assert trigger.evaluate('e=>document.activeElement===e')
            trigger.click(); pg.mouse.click(4,100); pg.wait_for_timeout(100)
            assert not pg.locator('dialog').evaluate('e=>e.open')
            trigger.click(); pg.evaluate("document.dispatchEvent(new Event('astro:before-swap'))")
            assert pg.evaluate('document.body.style.overflow')!='hidden' and pg.locator('.image-zoom-trigger').count()==0
            pg.evaluate("document.dispatchEvent(new Event('astro:page-load'))")
            assert pg.locator('.image-zoom-trigger').count()==original
            record('lightbox', mobile=mobile, imageCount=original, imageSrc=image.get_attribute('src'), checks=['double-click' if not mobile else 'touch-entry','Escape','close','backdrop','focus-return','focus-trap','keyboard-entry','scroll-lock','repeat-init','swap-cleanup'])
            ctx.close()
        assert not results['pageErrors'], results['pageErrors']
        results['passed']=True
    finally:
        (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
        browser.close()
print(json.dumps({'passed':results.get('passed',False),'checkGroups':len(results['checks']),'evidence':str(OUT)},ensure_ascii=False))
