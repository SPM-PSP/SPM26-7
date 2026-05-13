'use client';

import { useState, useEffect } from 'react';
import { tefCacheManager } from '@/lib/tef-cache';
import { generateTEFAnalysis } from '@/lib/tef-utils';
import type { FoodEntry } from '@/lib/types';

export default function TestTEFPage() {
  const [cacheStats, setCacheStats] = useState({ size: 0, oldestEntry: null });
  const [sampleFoodEntries, setSampleFoodEntries] = useState<FoodEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  // 确保只在客户端运行
  useEffect(() => {
    setIsClient(true);
    setCacheStats(tefCacheManager.getCacheStats());

    // 在客户端生成模拟食物条目
    const fixedTimestamp = '2024-01-15T12:00:00.000Z'; // 使用固定时间戳
    setSampleFoodEntries([
      {
        log_id: '1',
        food_name: '咖啡',
        consumed_grams: 200,
        meal_type: 'breakfast',
        nutritional_info_per_100g: {
          calories: 2,
          carbohydrates: 0,
          protein: 0.3,
          fat: 0
        },
        total_nutritional_info_consumed: {
          calories: 4,
          carbohydrates: 0,
          protein: 0.6,
          fat: 0
        },
        is_estimated: false,
        timestamp: fixedTimestamp
      },
      {
        log_id: '2',
        food_name: '辣椒炒肉',
        consumed_grams: 150,
        meal_type: 'lunch',
        nutritional_info_per_100g: {
          calories: 200,
          carbohydrates: 10,
          protein: 15,
          fat: 12
        },
        total_nutritional_info_consumed: {
          calories: 300,
          carbohydrates: 15,
          protein: 22.5,
          fat: 18
        },
        is_estimated: false,
        timestamp: fixedTimestamp
      }
    ]);
  }, []);

  const testCacheFunction = () => {
    console.log('=== TEF Cache Test ===');
    
    // 第一次计算
    console.log('1. First calculation...');
    const hash1 = tefCacheManager.generateFoodEntriesHash(sampleFoodEntries);
    console.log('Hash:', hash1);
    
    const cached1 = tefCacheManager.getCachedAnalysis(sampleFoodEntries);
    console.log('Cached result (should be null):', cached1);
    
    // 生成TEF分析
    const analysis = generateTEFAnalysis(sampleFoodEntries, 1.15);
    console.log('Generated analysis:', analysis);
    
    // 缓存结果
    tefCacheManager.setCachedAnalysis(sampleFoodEntries, analysis);
    console.log('Analysis cached');
    
    // 第二次获取（应该从缓存获取）
    console.log('2. Second retrieval...');
    const cached2 = tefCacheManager.getCachedAnalysis(sampleFoodEntries);
    console.log('Cached result (should exist):', cached2);
    
    // 测试哈希一致性
    const hash2 = tefCacheManager.generateFoodEntriesHash(sampleFoodEntries);
    console.log('Hash consistency:', hash1 === hash2);
    
    // 测试shouldAnalyzeTEF
    const shouldAnalyze1 = tefCacheManager.shouldAnalyzeTEF(sampleFoodEntries, '');
    const shouldAnalyze2 = tefCacheManager.shouldAnalyzeTEF(sampleFoodEntries, hash1);
    console.log('Should analyze (new):', shouldAnalyze1);
    console.log('Should analyze (same hash):', shouldAnalyze2);
    
    // 更新缓存统计
    setCacheStats(tefCacheManager.getCacheStats());
  };

  const clearCache = () => {
    if (!isClient) return;
    tefCacheManager.clearCache();
    setCacheStats(tefCacheManager.getCacheStats());
    console.log('Cache cleared');
  };

  // 在客户端渲染之前显示加载状态
  if (!isClient) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">TEF Cache Test Page</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">TEF Cache Test Page</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Cache Statistics</h2>
          <p>Cache Size: {cacheStats.size}</p>
          <p>Oldest Entry: {cacheStats.oldestEntry ? new Date(cacheStats.oldestEntry).toLocaleString() : 'None'}</p>
        </div>
        
        <div className="space-x-4">
          <button 
            onClick={testCacheFunction}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Cache Function
          </button>
          
          <button 
            onClick={clearCache}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Cache
          </button>
          
          <button 
            onClick={() => setCacheStats(tefCacheManager.getCacheStats())}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Refresh Stats
          </button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Sample Food Entries</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(sampleFoodEntries, null, 2)}
          </pre>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>点击 "Test Cache Function" 测试缓存功能</li>
            <li>查看浏览器控制台输出</li>
            <li>刷新页面测试持久化</li>
            <li>点击 "Clear Cache" 清空缓存</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
