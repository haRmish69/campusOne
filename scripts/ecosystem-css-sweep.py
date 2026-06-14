import os
import re
import glob

replacements = {
    # Remove all colored backgrounds
    r'\bbg-blue-50\b': 'bg-[var(--color-canvas-white)]',
    r'\bbg-purple-50\b': 'bg-[var(--color-canvas-white)]',
    r'\bbg-indigo-50\b': 'bg-[var(--color-canvas-white)]',
    r'\bbg-green-50\b': 'bg-[var(--color-canvas-white)]',
    r'\bbg-teal-50\b': 'bg-[var(--color-canvas-white)]',
    
    # Remove all colored text
    r'\btext-blue-600\b': 'text-[var(--color-graphite)]',
    r'\btext-blue-700\b': 'text-[var(--color-graphite)]',
    r'\btext-indigo-700\b': 'text-[var(--color-graphite)]',
    r'\btext-green-600\b': 'text-[var(--color-pewter)]',
    r'\btext-purple-700\b': 'text-[var(--color-graphite)]',
    r'\btext-teal-600\b': 'text-[var(--color-pewter)]',
    
    # Normalize colored borders
    r'\bborder-blue-200\b': 'border-[var(--color-paper)]',
    r'\bborder-green-200\b': 'border-[var(--color-paper)]',
    r'\bborder-purple-200\b': 'border-[var(--color-paper)]',
    
    # Normalize buttons
    r'\bbg-blue-600\b': 'bg-[var(--color-ember-orange)]',
    r'\bbg-indigo-600\b': 'bg-[var(--color-ember-orange)]',
    
    # Normalize radius
    r'\brounded-xl\b': 'rounded-[20px]',
    r'\brounded-2xl\b': 'rounded-[20px]',
    r'\brounded-3xl\b': 'rounded-[20px]',
    r'\brounded-lg\b': 'rounded-[12px]'
}

# Directories to sweep
directories = [
    'app/campus-ecosystem',
    'app/placement',
    'app/transport',
    'app/peer-learning'
]

# Get all TSX files
tsx_files = []
for d in directories:
    tsx_files.extend(glob.glob(f'{d}/**/*.tsx', recursive=True))

count = 0
for file in tsx_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in replacements.items():
        new_content = re.sub(pattern, replacement, new_content)
        
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
        print(f"Updated {file}")

print(f"Total files updated: {count}")
