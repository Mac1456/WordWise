import { ToneAnalysis } from '../services/textAnalysisService';

interface ToneAnalysisPanelProps {
  toneAnalysis: ToneAnalysis | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function ToneAnalysisPanel({ toneAnalysis, isLoading, onClose }: ToneAnalysisPanelProps) {
  const getToneColor = (tone: ToneAnalysis['overall'] | undefined) => {
    switch (tone) {
      case 'professional': return 'text-blue-600 bg-blue-50';
      case 'formal': return 'text-purple-600 bg-purple-50';
      case 'conversational': return 'text-green-600 bg-green-50';
      case 'passionate': return 'text-red-600 bg-red-50';
      case 'casual': return 'text-yellow-600 bg-yellow-50';
      case 'confident': return 'text-emerald-600 bg-emerald-50';
      case 'uncertain': return 'text-orange-600 bg-orange-50';
      case 'humble': return 'text-teal-600 bg-teal-50';
      case 'arrogant': return 'text-rose-600 bg-rose-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getToneIcon = (tone: ToneAnalysis['overall'] | undefined) => {
    switch (tone) {
      case 'confident':
        return (
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'uncertain':
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'arrogant':
        return (
          <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'professional':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2M8 6v2a2 2 0 002 2m0 0h4m-4 0a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2m-4 0V8a2 2 0 012-2h4a2 2 0 012 2v.01" />
          </svg>
        );
      case 'humble':
        return (
          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto transform transition-all duration-300 animate-scale-in">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Tone Analysis</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 text-gray-600 animate-pulse">Analyzing your writing tone...</p>
            </div>
          ) : !toneAnalysis ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="mt-4 text-gray-600 text-center">
                Tone analysis could not be completed.<br />
                <span className="text-sm text-gray-500">Please try again with more text.</span>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Tone */}
              <div className="bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Overall Tone
                </h3>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getToneColor(toneAnalysis.overall)}`}>
                  {getToneIcon(toneAnalysis.overall)}
                  <span className="ml-2">
                    {toneAnalysis.overall?.charAt(0).toUpperCase() + toneAnalysis.overall?.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                  {toneAnalysis.summary}
                </p>
              </div>

              {/* Strengths */}
              {toneAnalysis.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Strengths
                  </h3>
                  <div className="space-y-2">
                    {toneAnalysis.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 leading-relaxed">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {toneAnalysis.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Areas for Improvement
                  </h3>
                  <div className="space-y-2">
                    {toneAnalysis.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800 leading-relaxed">{weakness}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {toneAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Recommendations
                  </h3>
                  <div className="space-y-2">
                    {toneAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
@keyframes fade-in-scale {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fade-in-scale {
  animation: fade-in-scale 0.3s ease-out forwards;
}
*/ 