import re
from pathlib import Path

root = Path(r'D:\HK1-NAM4\smart-restaurant-pos-kds\frontend\src')
files = sorted(root.rglob('*.tsx'))

def find_func_blocks(text):
    pattern = re.compile(r'(?:function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{|const\s+[A-Za-z0-9_]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{|const\s+[A-Za-z0-9_]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{)')
    for m in pattern.finditer(text):
        brace_start = m.end() - 1
        i = brace_start + 1
        depth = 1
        while i < len(text) and depth > 0:
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
            i += 1
        if depth == 0:
            yield text[brace_start+1:end]

hook_names = ('useState','useEffect','useMemo','useRef','useCallback','useContext','useReducer','useLayoutEffect','useInsertionEffect','useRouter','useSearchParams','useParams','usePathname','use')

for path in files:
    text = path.read_text(encoding='utf-8')
    for block in find_func_blocks(text):
        # find top-level hooks and returns using a shallow parser
        hook_positions = []
        return_positions = []
        depth = 0
        i = 0
        while i < len(block):
            ch = block[i]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
            if depth == 0:
                # check for top-level hook call starting here
                for name in hook_names:
                    if block.startswith(name, i):
                        j = i + len(name)
                        if j < len(block) and block[j].isspace():
                            # allow spaces before (
                            k = j
                            while k < len(block) and block[k].isspace():
                                k += 1
                            if k < len(block) and block[k] == '(':
                                hook_positions.append(i)
                                i = k
                                break
                # check for return
                if block.startswith('return', i):
                    j = i + 6
                    if (j == len(block) or not (block[j].isalpha() or block[j] == '_')) and (i == 0 or not (block[i-1].isalpha() or block[i-1] == '_')):
                        return_positions.append(i)
            i += 1

        if hook_positions and return_positions:
            first_hook = min(hook_positions)
            if any(r < first_hook for r in return_positions):
                print('SUSPICIOUS:', path)
                print('first_hook', first_hook, 'returns', return_positions[:10])
                snippet = block[:600].replace('\n', '\\n')
                print(snippet)
                print('---')
