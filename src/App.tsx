import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getWeek, startOfMonth, endOfMonth, subWeeks, subMonths, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmotionRecord {
  id: string;
  emotions: { name: string; emoji: string; color: string }[];
  note: string;
  timestamp: Date;
  location?: string;
  situation?: string;
  reflection?: {
    mistake?: string;
    systemicIssue?: string;
    responsibility?: string;
  };
  insight?: {
    analysis?: string;
    comfort?: string;
    commitment?: string;
  };
}

interface EmotionType {
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
}

const emotions: EmotionType[] = [
  { name: '기쁨', emoji: '😊', color: 'text-yellow-600', bgColor: 'bg-yellow-100 hover:bg-yellow-200' },
  { name: '행복', emoji: '😄', color: 'text-orange-600', bgColor: 'bg-orange-100 hover:bg-orange-200' },
  { name: '사랑', emoji: '❤️', color: 'text-red-600', bgColor: 'bg-red-100 hover:bg-red-200' },
  { name: '평온', emoji: '😌', color: 'text-blue-600', bgColor: 'bg-blue-100 hover:bg-blue-200' },
  { name: '감사', emoji: '🙏', color: 'text-green-600', bgColor: 'bg-green-100 hover:bg-green-200' },
  { name: '흥미진진', emoji: '🤩', color: 'text-purple-600', bgColor: 'bg-purple-100 hover:bg-purple-200' },
  { name: '슬픔', emoji: '😢', color: 'text-blue-500', bgColor: 'bg-blue-50 hover:bg-blue-100' },
  { name: '화남', emoji: '😠', color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100' },
  { name: '걱정', emoji: '😰', color: 'text-yellow-500', bgColor: 'bg-yellow-50 hover:bg-yellow-100' },
  { name: '피곤', emoji: '😴', color: 'text-gray-500', bgColor: 'bg-gray-50 hover:bg-gray-100' },
  { name: '스트레스', emoji: '😣', color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  { name: '외로움', emoji: '😔', color: 'text-indigo-500', bgColor: 'bg-indigo-50 hover:bg-indigo-100' },
];

// 장소 옵션
const locationOptions = [
  { value: '직장', label: '직장' },
  { value: '집', label: '집' },
  { value: '학교', label: '학교' },
  { value: '공공장소', label: '공공장소' },
  { value: '사교모임', label: '사교모임' },
  { value: '자연 속', label: '자연 속' },
  { value: '기타', label: '기타 장소' },
];

// 실수 옵션
const mistakeOptions = [
  { value: '내 실수', label: '내 실수' },
  { value: '타인의 실수', label: '타인의 실수' },
  { value: '실수는 없었어', label: '실수는 없었어' },
  { value: '잘 모르겠어', label: '잘 모르겠어' },
];

// 시스템 문제 옵션
const systemicIssueOptions = [
  { value: '네, 확실히 있었어', label: '네, 확실히 있었어' },
  { value: '부분적으로 있어', label: '부분적으로 있어' },
  { value: '시스템 문제는 없었어', label: '시스템 문제는 없었어' },
  { value: '해당없음', label: '해당없음' },
];

// 책임 옵션
const responsibilityOptions = [
  { value: '대부분 내 책임', label: '대부분 내 책임' },
  { value: '대부분 타인의 책임', label: '대부분 타인의 책임' },
  { value: '동등하게 공유', label: '동등하게 공유' },
  { value: '외부 요인', label: '외부 요인' },
];

function App() {
  const [records, setRecords] = useState<EmotionRecord[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionType[]>([]);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [situation, setSituation] = useState('');
  const [reflection, setReflection] = useState({
    mistake: '',
    systemicIssue: '',
    responsibility: ''
  });
  const [insight, setInsight] = useState({
    analysis: '',
    comfort: '',
    commitment: ''
  });
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [formStep, setFormStep] = useState<1|2|3|4>(1);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState('record');
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month'>('week');
  const [statsView, setStatsView] = useState<'bar' | 'pie'>('bar');

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedRecords = localStorage.getItem('emotionRecords');
    if (savedRecords) {
      const parsedRecords = JSON.parse(savedRecords).map((record: Omit<EmotionRecord, 'timestamp'> & { timestamp: string }) => ({
        ...record,
        timestamp: new Date(record.timestamp)
      }));
      setRecords(parsedRecords);
    }
  }, []);

  // 로컬 스토리지에 데이터 저장
  const saveToStorage = (newRecords: EmotionRecord[]) => {
    localStorage.setItem('emotionRecords', JSON.stringify(newRecords));
  };

  // 감정 선택 토글
  const toggleEmotion = (emotion: EmotionType) => {
    setSelectedEmotions(prev => {
      // 이미 선택된 감정인지 확인
      const isSelected = prev.some(item => item.name === emotion.name);

      if (isSelected) {
        // 이미 선택된 감정이면 제거
        return prev.filter(item => item.name !== emotion.name);
      }
      // 선택되지 않은 감정이면 추가
      return [...prev, emotion];
    });
  };

  // 감정 기록 추가
  const addEmotionRecord = () => {
    if (selectedEmotions.length === 0) return;

    const newRecord: EmotionRecord = {
      id: Date.now().toString(),
      emotions: selectedEmotions.map(e => ({
        name: e.name,
        emoji: e.emoji,
        color: e.color
      })),
      note: note.trim(),
      timestamp: new Date(),
      location: location.trim() || undefined,
      situation: situation.trim() || undefined,
      reflection: {
        mistake: reflection.mistake.trim() || undefined,
        systemicIssue: reflection.systemicIssue.trim() || undefined,
        responsibility: reflection.responsibility.trim() || undefined
      },
      insight: {
        analysis: insight.analysis.trim() || undefined,
        comfort: insight.comfort.trim() || undefined,
        commitment: insight.commitment.trim() || undefined
      }
    };

    // 빈 객체인 경우 undefined로 설정
    if (!newRecord.reflection?.mistake && !newRecord.reflection?.systemicIssue && !newRecord.reflection?.responsibility) {
      newRecord.reflection = undefined;
    }

    if (!newRecord.insight?.analysis && !newRecord.insight?.comfort && !newRecord.insight?.commitment) {
      newRecord.insight = undefined;
    }

    const updatedRecords = [newRecord, ...records].slice(0, 100); // 최대 100개까지만 저장
    setRecords(updatedRecords);
    saveToStorage(updatedRecords);

    // 폼 초기화
    setSelectedEmotions([]);
    setNote('');
    setLocation('');
    setSituation('');
    setReflection({
      mistake: '',
      systemicIssue: '',
      responsibility: ''
    });
    setInsight({
      analysis: '',
      comfort: '',
      commitment: ''
    });
    setFormStep(1);
  };

  // 다음 폼 단계로 이동
  const nextFormStep = () => {
    if (formStep < 4) {
      if (formStep === 3) {
        // 자기 성찰 단계에서 AI 인사이트 단계로 넘어갈 때 AI 인사이트 생성
        generateAIInsight();
      }
      setFormStep((prev) => (prev + 1) as 1|2|3|4);
    }
  };

  // AI 인사이트 생성
  const generateAIInsight = () => {
    setIsGeneratingInsight(true);

    // 감정들과 상황을 기반으로 인사이트 생성
    const emotionNames = selectedEmotions.map(e => e.name).join(', ');
    const emotionDescription = selectedEmotions.length > 1
      ? `${emotionNames}의 복합적인 감정`
      : selectedEmotions[0]?.name;

    // 긍정적/부정적 감정 판단
    const positiveEmotions = ['기쁨', '행복', '사랑', '평온', '감사', '흥미진진'];
    const isPositive = selectedEmotions.some(e => positiveEmotions.includes(e.name));

    setTimeout(() => {
      // 객관적 분석
      let analysis = '';
      if (situation) {
        analysis = `현재 ${location || '이 상황'}에서 ${emotionDescription}을(를) 느끼고 있습니다. `;

        if (reflection.mistake === '내 실수') {
          analysis += '본인의 실수를 인지하고 있으며, ';
        } else if (reflection.mistake === '타인의 실수') {
          analysis += '타인의 실수로 인한 영향을 받고 있으며, ';
        }

        if (reflection.systemicIssue === '네, 확실히 있었어' || reflection.systemicIssue === '부분적으로 있어') {
          analysis += '구조적인 문제가 이 상황에 영향을 미치고 있습니다. ';
        }

        analysis += `책임은 ${reflection.responsibility || '여러 요인이 복합적으로 작용하여'} 발생한 것으로 보입니다.`;
      } else {
        analysis = `현재 ${emotionDescription}을(를) 느끼고 있습니다. 이러한 감정은 우리 삶에서 자연스러운 부분이며, 이를 인식하고 표현하는 것은 감정 관리의 첫 단계입니다.`;
      }

      // 위로와 조언
      let comfort = '';
      if (isPositive) {
        comfort = `${emotionDescription}을(를) 느끼는 것은 매우 긍정적인 경험입니다. 이 감정을 충분히 음미하고 감사하는 시간을 가져보세요. 이런 순간들이 앞으로의 삶에 활력을 줄 것입니다.`;
      } else {
        comfort = `${emotionDescription}을(를) 느끼는 것은 어려울 수 있지만, 모든 감정은 일시적이며 결국 지나갑니다. 자신에게 필요한 공간과 시간을 주고, 가능하다면 신뢰할 수 있는 사람과 대화를 나누어 보세요.`;

        if (reflection.mistake === '내 실수') {
          comfort += ' 실수는 누구나 할 수 있으며, 이를 통해 성장할 기회로 삼을 수 있습니다.';
        }
      }

      // 다짐 문장
      let commitment = '';
      if (isPositive) {
        commitment = `앞으로도 이런 ${emotionDescription}을(를) 자주 느낄 수 있는 상황을 의식적으로 만들고, 감사함을 표현하며 살아가겠습니다.`;
      } else {
        if (reflection.systemicIssue === '네, 확실히 있었어') {
          commitment = `이러한 구조적 문제에 대해 내가 할 수 있는 작은 변화부터 시작하고, 필요하다면 도움을 요청하겠습니다.`;
        } else if (reflection.responsibility === '대부분 내 책임') {
          commitment = `앞으로는 비슷한 상황에서 더 나은 선택을 할 수 있도록 지금의 경험을 교훈 삼아 성장하겠습니다.`;
        } else {
          commitment = `이 감정을 인정하고 받아들이면서, 내 감정에 압도되지 않고 균형을 찾을 수 있는 방법을 모색하겠습니다.`;
        }
      }

      setInsight({
        analysis,
        comfort,
        commitment
      });

      setIsGeneratingInsight(false);
    }, 1500); // 실제 API 호출 대신 타임아웃으로 대체
  };

  // 이전 폼 단계로 이동
  const prevFormStep = () => {
    if (formStep > 1) {
      setFormStep((prev) => (prev - 1) as 1|2|3|4);
    }
  };

  // 최근 기록들 (최대 5개)
  const recentRecords = records.slice(0, 5);

  // 날짜별 감정 기록 그룹화
  const recordsByDate = useMemo(() => {
    const grouped: Record<string, EmotionRecord[]> = {};

    for (const record of records) {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    }

    return grouped;
  }, [records]);

  // 선택한 날짜의 기록들
  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split('T')[0];
    return recordsByDate[dateKey] || [];
  }, [selectedDate, recordsByDate]);

  // 각 날짜에 기록된 감정들 표시하기 위한 데이터
  const emotionsByDate = useMemo(() => {
    const result: Record<string, { emojis: string[], count: number }> = {};

    for (const [dateKey, dateRecords] of Object.entries(recordsByDate)) {
      const allEmojis = dateRecords.flatMap(record => record.emotions.map(e => e.emoji));
      result[dateKey] = {
        emojis: allEmojis.slice(0, 3), // 최대 3개까지만 표시
        count: dateRecords.length
      };
    }

    return result;
  }, [recordsByDate]);

  // 달력 날짜 렌더링 함수
  const renderCalendarDay = (day: Date | undefined) => {
    if (!day) return null;

    const dateKey = day.toISOString().split('T')[0];
    const dayEmotions = emotionsByDate[dateKey];

    if (!dayEmotions) {
      return <div className="w-full h-full flex items-center justify-center">{day.getDate()}</div>;
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        <div>{day.getDate()}</div>
        <div className="text-sm mt-1 flex space-x-1">
          {dayEmotions.emojis.map((emoji) => (
            <span key={`${dateKey}-${emoji}`}>{emoji}</span>
          ))}
        </div>
        {dayEmotions.count > 1 && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
      </div>
    );
  };

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 감정 통계 데이터 계산
  const statsData = useMemo(() => {
    if (records.length === 0) return { weeklyData: [], monthlyData: [], emotionCounts: [] };

    const today = new Date();

    // 주간 데이터 범위 계산
    const startOfLastWeek = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });

    // 월간 데이터 범위 계산
    const startOfLastMonth = startOfMonth(subMonths(today, 1));
    const endOfCurrentMonth = endOfMonth(today);

    // 주간 데이터 계산
    const weekDays = eachDayOfInterval({ start: startOfLastWeek, end: endOfCurrentWeek });
    const weeklyData = weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayRecords = records.filter(r =>
        format(r.timestamp, 'yyyy-MM-dd') === dateStr
      );

      // 긍정적/부정적 감정 개수 계산
      let positiveCount = 0;
      let negativeCount = 0;

      for (const record of dayRecords) {
        for (const emotion of record.emotions) {
          if (['기쁨', '행복', '사랑', '평온', '감사', '흥미진진'].includes(emotion.name)) {
            positiveCount++;
          } else {
            negativeCount++;
          }
        }
      }

      return {
        date: format(day, 'MM/dd (EEE)', { locale: ko }),
        긍정: positiveCount,
        부정: negativeCount,
        전체: positiveCount + negativeCount
      };
    });

    // 월간 데이터 계산
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const weekStart = subWeeks(today, 5 - i);
      const weekNumber = getWeek(weekStart);

      const weekRecords = records.filter(r => {
        const recordDate = r.timestamp;
        return recordDate >= startOfWeek(weekStart, { weekStartsOn: 1 }) &&
               recordDate <= endOfWeek(weekStart, { weekStartsOn: 1 });
      });

      // 긍정적/부정적 감정 개수 계산
      let positiveCount = 0;
      let negativeCount = 0;

      for (const record of weekRecords) {
        for (const emotion of record.emotions) {
          if (['기쁨', '행복', '사랑', '평온', '감사', '흥미진진'].includes(emotion.name)) {
            positiveCount++;
          } else {
            negativeCount++;
          }
        }
      }

      return {
        week: `${weekNumber}주차`,
        긍정: positiveCount,
        부정: negativeCount,
        전체: positiveCount + negativeCount
      };
    });

    // 전체 감정 분포 계산
    const emotionCounts: Record<string, number> = {};

    for (const record of records) {
      for (const emotion of record.emotions) {
        if (!emotionCounts[emotion.name]) {
          emotionCounts[emotion.name] = 0;
        }
        emotionCounts[emotion.name]++;
      }
    }

    const emotionCountsArray = Object.entries(emotionCounts).map(([name, value]) => {
      const emotion = emotions.find(e => e.name === name);
      return {
        name,
        value,
        color: `${emotion?.color.replace('text-', 'var(--')})`,
        emoji: emotion?.emoji
      };
    }).sort((a, b) => b.value - a.value);

    return {
      weeklyData,
      monthlyData,
      emotionCounts: emotionCountsArray
    };
  }, [records]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">감정 기록</h1>
          <p className="text-gray-600">오늘 당신의 기분은 어떠신가요?</p>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="record">기록하기</TabsTrigger>
            <TabsTrigger value="calendar">달력 보기</TabsTrigger>
            <TabsTrigger value="stats">통계 보기</TabsTrigger>
          </TabsList>

          {/* 감정 기록 탭 */}
          <TabsContent value="record" className="space-y-6">
            {/* 감정 기록 폼 */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">
                  {formStep === 1 && "지금 기분 기록하기"}
                  {formStep === 2 && "장소와 상황"}
                  {formStep === 3 && "자기 성찰"}
                  {formStep === 4 && "AI 인사이트"}
                </CardTitle>
                <CardDescription>
                  {formStep === 1 && "현재 느끼고 있는 감정을 선택하고 간단한 메모를 남겨보세요."}
                  {formStep === 2 && "어디서 무슨 일이 있었는지 기록해보세요."}
                  {formStep === 3 && "이 상황에 대한 자기 성찰을 해보세요."}
                  {formStep === 4 && "AI가 생성한 인사이트를 확인하고 수정할 수 있습니다."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {formStep === 1 && (
                  <>
                    {/* 감정 선택 */}
                    <div>
                      <h3 className="text-sm font-medium mb-3">1. 지금 어떤 감정이야? (다중 선택 가능)</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {emotions.map((emotion) => {
                          const isSelected = selectedEmotions.some(e => e.name === emotion.name);
                          return (
                            <Button
                              key={emotion.name}
                              variant={isSelected ? "default" : "outline"}
                              className={`h-auto p-3 flex flex-col items-center gap-1 ${
                                isSelected
                                  ? `${emotion.bgColor} border-2 border-current`
                                  : `${emotion.bgColor} border hover:border-current`
                              } ${emotion.color}`}
                              onClick={() => toggleEmotion(emotion)}
                            >
                              <span className="text-xl">{emotion.emoji}</span>
                              <span className="text-xs font-medium">{emotion.name}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 선택된 감정 요약 */}
                    {selectedEmotions.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h3 className="text-sm font-medium mb-2">선택된 감정:</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedEmotions.map(emotion => (
                            <Badge key={emotion.name} className={emotion.color}>
                              {emotion.emoji} {emotion.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 메모 입력 */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">간단한 메모 (선택사항)</h3>
                      <Textarea
                        placeholder="이 감정에 대해 간단히 메모하고 싶은 내용이 있다면 작성해주세요..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={nextFormStep}
                        disabled={selectedEmotions.length === 0}
                      >
                        다음 단계
                      </Button>
                    </div>
                  </>
                )}

                {formStep === 2 && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium mb-2">2. 장소가 어디야?</h3>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="장소를 선택해주세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {locationOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">3. 무슨 일이 있었나요?</h3>
                      <Textarea
                        placeholder="어떤 상황이었는지 간략히 설명해주세요..."
                        value={situation}
                        onChange={(e) => setSituation(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={prevFormStep}
                      >
                        이전으로
                      </Button>
                      <Button onClick={nextFormStep}>
                        다음 단계
                      </Button>
                    </div>
                  </>
                )}

                {formStep === 3 && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium mb-2">4. 다음 질문에 답해주세요.</h3>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-gray-700 mb-1">실수가 있었나요?</h4>
                          <Select value={reflection.mistake} onValueChange={(value) => setReflection({...reflection, mistake: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="선택해주세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {mistakeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <h4 className="text-xs text-gray-700 mb-1">구조적인(시스템적) 문제가 있었나요?</h4>
                          <Select value={reflection.systemicIssue} onValueChange={(value) => setReflection({...reflection, systemicIssue: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="선택해주세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {systemicIssueOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <h4 className="text-xs text-gray-700 mb-1">책임소지는 어떻게 될까?</h4>
                          <Select value={reflection.responsibility} onValueChange={(value) => setReflection({...reflection, responsibility: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="선택해주세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {responsibilityOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={prevFormStep}
                      >
                        이전으로
                      </Button>
                      <Button onClick={nextFormStep}>
                        다음 단계
                      </Button>
                    </div>
                  </>
                )}

                {formStep === 4 && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium mb-2">AI 인사이트</h3>

                      {isGeneratingInsight ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm text-gray-500">AI 인사이트를 생성 중입니다...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs text-gray-700 mb-1">객관적 분석</h4>
                            <Textarea
                              placeholder="AI가 생성한 객관적 분석이 여기에 표시됩니다..."
                              value={insight.analysis}
                              onChange={(e) => setInsight({...insight, analysis: e.target.value})}
                              className="min-h-[60px] resize-none"
                            />
                          </div>

                          <div>
                            <h4 className="text-xs text-gray-700 mb-1">위로와 조언</h4>
                            <Textarea
                              placeholder="AI가 생성한 위로와 조언이 여기에 표시됩니다..."
                              value={insight.comfort}
                              onChange={(e) => setInsight({...insight, comfort: e.target.value})}
                              className="min-h-[60px] resize-none"
                            />
                          </div>

                          <div>
                            <h4 className="text-xs text-gray-700 mb-1">다짐 문장</h4>
                            <Textarea
                              placeholder="AI가 생성한 다짐 문장이 여기에 표시됩니다..."
                              value={insight.commitment}
                              onChange={(e) => setInsight({...insight, commitment: e.target.value})}
                              className="min-h-[60px] resize-none"
                            />
                          </div>

                          <div className="flex justify-center">
                            <Button
                              variant="outline"
                              onClick={generateAIInsight}
                              className="text-xs"
                              size="sm"
                            >
                              다시 생성하기
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={prevFormStep}
                      >
                        이전으로
                      </Button>
                      <Button
                        onClick={addEmotionRecord}
                        disabled={isGeneratingInsight}
                      >
                        기록 완료
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 최근 기록 */}
            {recentRecords.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">최근 기록</CardTitle>
                    <CardDescription>최근에 기록한 감정들입니다.</CardDescription>
                  </div>
                  <Dialog open={showHistory} onOpenChange={setShowHistory}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        전체 보기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>감정 기록 히스토리</DialogTitle>
                        <DialogDescription>
                          지금까지 기록한 모든 감정들입니다. (총 {records.length}개)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 mt-4">
                        {records.map((record) => (
                          <div key={record.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                {record.emotions.map((emotion) => (
                                  <span key={`${record.id}-emoji-${emotion.name}`} className="text-lg">{emotion.emoji}</span>
                                ))}
                                {record.emotions.map((emotion) => (
                                  <Badge key={`${record.id}-badge-${emotion.name}`} variant="secondary" className={emotion.color}>
                                    {emotion.name}
                                  </Badge>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(record.timestamp)}
                              </span>
                            </div>

                            {/* 장소와 상황 */}
                            {(record.location || record.situation) && (
                              <div className="mt-2 space-y-1">
                                {record.location && (
                                  <div className="flex gap-2 text-sm">
                                    <span className="text-gray-500">장소:</span>
                                    <span>{record.location}</span>
                                  </div>
                                )}
                                {record.situation && (
                                  <div className="flex gap-2 text-sm">
                                    <span className="text-gray-500">상황:</span>
                                    <span>{record.situation}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 기본 메모 */}
                            {record.note && (
                              <p className="text-sm text-gray-600 ml-7">{record.note}</p>
                            )}

                            {/* 자기 성찰 */}
                            {record.reflection && (
                              <div className="mt-2 bg-gray-50 p-2 rounded-md space-y-1">
                                <h4 className="text-xs font-semibold">자기 성찰</h4>
                                {record.reflection.mistake && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">실수: </span>
                                    <span>{record.reflection.mistake}</span>
                                  </div>
                                )}
                                {record.reflection.systemicIssue && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">구조적 문제: </span>
                                    <span>{record.reflection.systemicIssue}</span>
                                  </div>
                                )}
                                {record.reflection.responsibility && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">책임: </span>
                                    <span>{record.reflection.responsibility}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* AI 인사이트 */}
                            {record.insight && (
                              <div className="mt-2 bg-blue-50 p-2 rounded-md space-y-1">
                                <h4 className="text-xs font-semibold">AI 인사이트</h4>
                                {record.insight.analysis && (
                                  <div className="text-xs">
                                    <span className="text-blue-500">분석: </span>
                                    <span>{record.insight.analysis}</span>
                                  </div>
                                )}
                                {record.insight.comfort && (
                                  <div className="text-xs">
                                    <span className="text-blue-500">조언: </span>
                                    <span>{record.insight.comfort}</span>
                                  </div>
                                )}
                                {record.insight.commitment && (
                                  <div className="text-xs">
                                    <span className="text-blue-500">다짐: </span>
                                    <span>{record.insight.commitment}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentRecords.map((record) => (
                      <div key={record.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex flex-wrap gap-1">
                          {record.emotions.map((emotion) => (
                            <span key={`${record.id}-emoji-${emotion.name}`} className="text-lg">{emotion.emoji}</span>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {record.emotions.map((emotion) => (
                              <Badge key={`${record.id}-badge-${emotion.name}`} variant="secondary" className={emotion.color}>
                                {emotion.name}
                              </Badge>
                            ))}
                            <span className="text-xs text-gray-500">
                              {formatDate(record.timestamp)}
                            </span>
                          </div>

                          {/* 기본 정보 */}
                          <div className="flex flex-col gap-1">
                            {record.location && (
                              <div className="flex gap-1 text-xs">
                                <span className="text-gray-500">장소:</span>
                                <span className="truncate">{record.location}</span>
                              </div>
                            )}
                            {record.note && (
                              <p className="text-sm text-gray-600 truncate">{record.note}</p>
                            )}
                          </div>

                          {/* 추가 정보 표시 버튼 */}
                          {(record.situation || record.reflection || record.insight) && (
                            <Button
                              variant="link"
                              size="sm"
                              className="text-xs p-0 h-auto mt-1"
                              onClick={() => {
                                setShowHistory(true);
                              }}
                            >
                              자세히 보기...
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 통계 정보 */}
            {records.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">나의 감정 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{records.length}</div>
                      <div className="text-sm text-gray-600">총 기록 수</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {records.filter(r => r.emotions.some(e => e.name === '행복')).length}
                      </div>
                      <div className="text-sm text-gray-600">행복한 순간</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 달력으로 감정 보기 */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">달력으로 감정 보기</CardTitle>
                <CardDescription>
                  날짜별로 기록된 감정을 확인해보세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="border rounded-md p-3"
                />
              </CardContent>
            </Card>

            {/* 선택한 날짜의 감정 기록 */}
            {selectedDateRecords.length > 0 ? (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {selectedDate?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}의 감정 기록
                  </CardTitle>
                  <CardDescription>
                    이 날 기록된 {selectedDateRecords.length}개의 감정입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDateRecords.map((record) => (
                      <div key={record.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {record.emotions.map((emotion) => (
                              <span key={`${record.id}-emoji-${emotion.name}`} className="text-lg">{emotion.emoji}</span>
                            ))}
                            {record.emotions.map((emotion) => (
                              <Badge key={`${record.id}-badge-${emotion.name}`} variant="secondary" className={emotion.color}>
                                {emotion.name}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {record.timestamp.toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* 장소와 상황 */}
                        {(record.location || record.situation) && (
                          <div className="mt-2 space-y-1">
                            {record.location && (
                              <div className="flex gap-2 text-sm">
                                <span className="text-gray-500">장소:</span>
                                <span>{record.location}</span>
                              </div>
                            )}
                            {record.situation && (
                              <div className="flex gap-2 text-sm">
                                <span className="text-gray-500">상황:</span>
                                <span>{record.situation}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 기본 메모 */}
                        {record.note && (
                          <p className="text-sm text-gray-600 ml-7">{record.note}</p>
                        )}

                        {/* 자기 성찰 */}
                        {record.reflection && (
                          <div className="mt-2 bg-gray-50 p-2 rounded-md space-y-1">
                            <h4 className="text-xs font-semibold">자기 성찰</h4>
                            {record.reflection.mistake && (
                              <div className="text-xs">
                                <span className="text-gray-500">실수: </span>
                                <span>{record.reflection.mistake}</span>
                              </div>
                            )}
                            {record.reflection.systemicIssue && (
                              <div className="text-xs">
                                <span className="text-gray-500">구조적 문제: </span>
                                <span>{record.reflection.systemicIssue}</span>
                              </div>
                            )}
                            {record.reflection.responsibility && (
                              <div className="text-xs">
                                <span className="text-gray-500">책임: </span>
                                <span>{record.reflection.responsibility}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI 인사이트 */}
                        {record.insight && (
                          <div className="mt-2 bg-blue-50 p-2 rounded-md space-y-1">
                            <h4 className="text-xs font-semibold">AI 인사이트</h4>
                            {record.insight.analysis && (
                              <div className="text-xs">
                                <span className="text-blue-500">분석: </span>
                                <span>{record.insight.analysis}</span>
                              </div>
                            )}
                            {record.insight.comfort && (
                              <div className="text-xs">
                                <span className="text-blue-500">조언: </span>
                                <span>{record.insight.comfort}</span>
                              </div>
                            )}
                            {record.insight.commitment && (
                              <div className="text-xs">
                                <span className="text-blue-500">다짐: </span>
                                <span>{record.insight.commitment}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : selectedDate ? (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <p className="text-gray-500">이 날에 기록된 감정이 없습니다.</p>
                    {activeTab === 'calendar' && (
                      <Button
                        className="mt-4"
                        onClick={() => {
                          setActiveTab('record');
                          setSelectedDate(new Date());
                        }}
                      >
                        오늘의 감정 기록하기
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {/* 통계 탭 */}
          <TabsContent value="stats" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">감정 트렌드 분석</CardTitle>
                <CardDescription>
                  기간별 감정 변화를 확인해보세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 기간 선택 */}
                <div className="flex gap-2">
                  <Button
                    variant={statsPeriod === 'week' ? 'default' : 'outline'}
                    onClick={() => setStatsPeriod('week')}
                    className="flex-1"
                  >
                    최근 2주
                  </Button>
                  <Button
                    variant={statsPeriod === 'month' ? 'default' : 'outline'}
                    onClick={() => setStatsPeriod('month')}
                    className="flex-1"
                  >
                    최근 6주
                  </Button>
                </div>

                {/* 차트 타입 선택 */}
                <div className="flex gap-2">
                  <Button
                    variant={statsView === 'bar' ? 'default' : 'outline'}
                    onClick={() => setStatsView('bar')}
                    className="flex-1"
                  >
                    막대 차트
                  </Button>
                  <Button
                    variant={statsView === 'pie' ? 'default' : 'outline'}
                    onClick={() => setStatsView('pie')}
                    className="flex-1"
                  >
                    파이 차트
                  </Button>
                </div>

                {/* 차트 표시 */}
                {records.length > 0 ? (
                  <div className="w-full h-[300px] mt-4">
                    {statsView === 'bar' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={statsPeriod === 'week' ? statsData.weeklyData : statsData.monthlyData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis dataKey={statsPeriod === 'week' ? 'date' : 'week'} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="긍정" fill="#4ade80" />
                          <Bar dataKey="부정" fill="#f87171" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                        <div className="flex flex-col items-center">
                          <h3 className="text-sm font-medium mb-2">감정 분포</h3>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={statsData.emotionCounts}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {statsData.emotionCounts.map((entry) => (
                                  <Cell key={`cell-${entry.name}`} fill={entry.color || `#${Math.floor(Math.random()*16777215).toString(16)}`} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name) => [`${value}회`, name]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col items-center">
                          <h3 className="text-sm font-medium mb-2">주요 감정 TOP 5</h3>
                          <div className="space-y-2 w-full">
                            {statsData.emotionCounts.slice(0, 5).map((emotion, idx) => (
                              <div key={emotion.name} className="flex items-center gap-2">
                                <span>{idx + 1}.</span>
                                <span>{emotion.emoji}</span>
                                <span className="font-medium">{emotion.name}</span>
                                <span className="text-sm text-gray-500 ml-auto">{emotion.value}회</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">감정 기록이 없습니다.</p>
                    <p className="text-gray-500 text-sm">감정을 기록하면 트렌드를 확인할 수 있습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 감정 통계 요약 */}
            {records.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">감정 통계 요약</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{records.length}</div>
                      <div className="text-sm text-gray-600">총 기록 수</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {records.filter(r => r.emotions.some(e => e.name === '행복')).length}
                      </div>
                      <div className="text-sm text-gray-600">행복한 순간</div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {Math.round(records.filter(r => r.emotions.some(e =>
                          ['기쁨', '행복', '사랑', '평온', '감사', '흥미진진'].includes(e.name)
                        )).length / records.length * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">긍정적 감정 비율</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {statsData.emotionCounts.length > 0 ? statsData.emotionCounts[0].name : '-'}
                      </div>
                      <div className="text-sm text-gray-600">가장 많은 감정</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
