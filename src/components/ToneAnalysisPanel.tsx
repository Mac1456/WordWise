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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Tone Analysis</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Analyzing tone...</p>
            </div>
          ) : !toneAnalysis ? (
            <div className="flex flex-col items-center justify-center h-48">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="mt-4 text-gray-600">Tone analysis could not be loaded.</p>
            </div>
          ) : (
            <>
              {/* Overall Tone */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Overall Tone</h3>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getToneColor(toneAnalysis.overall)}`}>
                  {getToneIcon(toneAnalysis.overall)}
                  <span className="ml-2">
                    {toneAnalysis.overall?.charAt(0).toUpperCase() + toneAnalysis.overall?.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  {toneAnalysis.summary}
                </p>
              </div>

              {/* Strengths */}
              {toneAnalysis.strengths.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Strengths
                  </h3>
                  <div className="space-y-2">
                    {toneAnalysis.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {toneAnalysis.weaknesses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Areas for Improvement
                  </h3>
                  <div className="space-y-2">
                    {toneAnalysis.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">{weakness}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {toneAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Recommendations
                  </h3>
                  <div className="space-y-2">
                    {toneAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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