import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export default function VictusByteAISearch() {
  const [products, setProducts] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // 1. Fetch live products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://api.victusbyte.com/api/product/client');
        const data = await response.json();
        const productList = Array.isArray(data) ? data : data.products || data.data || data.result || [];
        setProducts(productList);
        setResults(productList);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setFetchingData(false);
      }
    };
    fetchProducts();
  }, []);

  // 2. AI Search Handler
  const handleAISearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults(products);
      setAiExplanation('');
      return;
    }
    if (products.length === 0) return;

    setLoading(true);
    setAiExplanation('');

    try {
      const catalogSnippet = products.slice(0, 40).map((p, index) => ({
        index: index,
        id: p._id || p.id,
        name: p.name,
        category: p.category,
        description: p.description || p.subtitle || ''
      }));

      const prompt = `
        You are the intelligent search engine for Victus Byte.
        Here is our catalog snippet: ${JSON.stringify(catalogSnippet)}
        Customer search: "${query}"
        Return strict raw JSON with:
        - "matchedIndices": array of matching numbers from "index"
        - "explanation": a short 1-sentence friendly explanation.
        No markdown, no backticks, ONLY raw JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const cleanJsonText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonText);

      const filtered = products.filter((_, index) => parsed.matchedIndices.includes(index));
      setResults(filtered.length > 0 ? filtered : products);
      setAiExplanation(parsed.explanation);
    } catch (error) {
      console.error("AI Search Error:", error);
      const fallback = products.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()));
      setResults(fallback);
      setAiExplanation("Showing standard keyword matches due to a network connection issue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Victus Byte Store</h2>
        <p className="text-xs text-gray-500 mt-1">AI-powered search connected live to MongoDB inventory</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleAISearch} className="flex gap-2 mb-6 max-w-3xl mx-auto">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">✨</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask AI to find products (e.g., 'gaming gear')..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || fetchingData}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Thinking...' : 'AI Search'}
        </button>
      </form>

      {/* AI Explanation Banner */}
      {aiExplanation && (
        <div className="max-w-3xl mx-auto bg-blue-50 border border-blue-100 text-blue-800 text-xs p-4 rounded-xl mb-6 shadow-sm flex items-center gap-2">
          <span>💡</span>
          <span>{aiExplanation}</span>
        </div>
      )}

      {/* CONDITIONAL RENDERING: Shimmer Skeletons vs Real Cards */}
      {fetchingData || loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between">
              <div>
                {/* Image Skeleton */}
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                {/* Category & Price Skeleton */}
                <div className="flex justify-between items-center mb-3">
                  <div className="w-16 h-5 bg-gray-200 rounded-md"></div>
                  <div className="w-12 h-5 bg-gray-200 rounded-md"></div>
                </div>
                {/* Title Skeleton */}
                <div className="w-3/4 h-5 bg-gray-200 rounded-md mb-2"></div>
                {/* Description Skeleton */}
                <div className="w-full h-4 bg-gray-200 rounded-md mb-1"></div>
                <div className="w-2/3 h-4 bg-gray-200 rounded-md"></div>
              </div>
              {/* Button Skeleton */}
              <div className="mt-6 pt-4 border-t border-gray-50">
                <div className="w-full h-9 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Real Product Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.length > 0 ? (
            results.map((product) => {
              const sellingPrice = product.price?.selling !== undefined ? product.price.selling : (product.price || 'N/A');
              const discountPrice = product.price?.discount !== undefined ? product.price.discount : null;

              return (
                <div 
                  key={product._id || product.id} 
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {product.image && (
                      <div className="h-48 overflow-hidden rounded-xl mb-4 bg-gray-50">
                        <img 
                          src={Array.isArray(product.image) ? product.image[0] : product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-md">
                        {product.category || 'General'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900">${sellingPrice}</span>
                        {discountPrice && (
                          <span className="text-xs text-gray-400 line-through">${discountPrice}</span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-800 text-base mb-1">{product.name}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {product.description || product.subtitle || 'No description available.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <button className="w-full bg-gray-900 hover:bg-blue-600 text-white font-medium py-2 rounded-xl text-xs transition-colors">
                      View Product
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">No products found matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}