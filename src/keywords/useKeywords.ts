import { useState, useEffect } from 'react';
import { LazyStore } from '@tauri-apps/plugin-store';
import { KeywordCategory } from '../lib/types';
import { defaultKeywords } from './defaultKeywords';

const store = new LazyStore('settings.json');
const KEYWORDS_KEY = 'keyword_categories';

export const useKeywords = () => {
  const [categories, setCategories] = useState<KeywordCategory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadKeywords = async () => {
      try {
        const saved = await store.get<KeywordCategory[]>(KEYWORDS_KEY);
        if (saved) {
          setCategories(saved);
        } else {
          setCategories(defaultKeywords);
          await store.set(KEYWORDS_KEY, defaultKeywords);
          await store.save();
        }
      } catch (e) {
        console.error('Failed to load keywords', e);
        setCategories(defaultKeywords);
      } finally {
        setIsLoaded(true);
      }
    };
    loadKeywords();
  }, []);

  const saveCategories = async (newCategories: KeywordCategory[]) => {
    setCategories(newCategories);
    await store.set(KEYWORDS_KEY, newCategories);
    await store.save();
  };

  const addCategory = async () => {
    const newCat: KeywordCategory = {
      id: crypto.randomUUID(),
      name: 'New Category',
      color: '#00ff00',
      style: 'background',
      words: [],
      enabled: true
    };
    const updated = [...categories, newCat];
    await saveCategories(updated);
  };

  const updateCategory = async (id: string, updates: Partial<KeywordCategory>) => {
    const updated = categories.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    );
    await saveCategories(updated);
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(cat => cat.id !== id);
    await saveCategories(updated);
  };

  const addWord = async (categoryId: string, word: string) => {
    if (!word.trim()) return;
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    if (category.words.includes(word)) return;

    await updateCategory(categoryId, { words: [...category.words, word] });
  };

  const removeWord = async (categoryId: string, word: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    await updateCategory(categoryId, { words: category.words.filter(w => w !== word) });
  };

  return {
    categories,
    isLoaded,
    addCategory,
    updateCategory,
    deleteCategory,
    addWord,
    removeWord
  };
};
