import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

interface CalendarProps {
  selectedDates: Date[];
  onDateClick: (date: Date) => void;
  targetMonth: Date;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDates, onDateClick, targetMonth }) => {
  const generateCalendarDays = useCallback(() => {
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [targetMonth]);

  const days = generateCalendarDays();
  
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === targetMonth.getMonth();
  };
  
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  const isSelected = (date: Date): boolean => {
    return selectedDates.some(d => d.toDateString() === date.toDateString());
  };

  const formatDate = (date: Date): string => {
    return date.getDate().toString();
  };

  const getDateClassName = (date: Date): string => {
    const classes = ['calendar-day'];
    
    if (!isCurrentMonth(date)) classes.push('other-month');
    if (isToday(date)) classes.push('today');
    if (isSelected(date)) classes.push('selected');
    if (isCurrentMonth(date)) classes.push('current-month');
    
    return classes.join(' ');
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <h2>{targetMonth.getFullYear()}년 {targetMonth.getMonth() + 1}월</h2>
      </div>
      <div className="weekdays">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day, index) => (
          <div
            key={index}
            className={getDateClassName(day)}
            onClick={() => isCurrentMonth(day) && onDateClick(day)}
          >
            {formatDate(day)}
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [targetMonth, setTargetMonth] = useState<Date>(new Date());
  const [generatedCode, setGeneratedCode] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setTargetMonth(nextMonth);
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    const isAlreadySelected = selectedDates.some(d => d.toDateString() === date.toDateString());
    
    if (isAlreadySelected) {
      setSelectedDates(prev => prev.filter(d => d.toDateString() !== date.toDateString()));
    } else {
      if (selectedDates.length < 8) {
        setSelectedDates(prev => [...prev, new Date(date)]);
      }
    }
  }, [selectedDates]);

  const removeDate = useCallback((date: Date) => {
    setSelectedDates(prev => prev.filter(d => d.toDateString() !== date.toDateString()));
  }, []);

  const generateSchedulerCode = useCallback(() => {
    if (selectedDates.length !== 8) return;
    
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatDateKorean = (date: Date): string => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const weekday = weekdays[date.getDay()];
      return `${year}년 ${month}월 ${day}일 (${weekday})`;
    };

    const batchContent = sortedDates.map((date, index) => {
      const taskName = `ReservationMacro_${formatDate(date).replace(/-/g, '_')}`;
      const dateStr = formatDate(date);
      
      return `
REM 작업 ${index + 1}: ${formatDateKorean(date)}
schtasks /create /tn "${taskName}" /tr "C:\\\\path\\\\to\\\\reserve.exe" /sc once /sd ${dateStr} /st 00:01 /ru SYSTEM /f
if %errorlevel% neq 0 (
    echo 작업 ${index + 1} 생성 실패: ${formatDateKorean(date)}
) else (
    echo 작업 ${index + 1} 생성 성공: ${formatDateKorean(date)}
)`;
    }).join('\n');

    const fullBatchContent = `@echo off
chcp 65001
echo ==========================================
echo 주차 예약 시스템 - 스케줄러 등록
echo ==========================================
echo.
echo 다음 날짜에 대한 스케줄러를 등록합니다:
${sortedDates.map((date, index) => `echo ${index + 1}. ${formatDateKorean(date)}`).join('\n')}
echo.
echo 관리자 권한이 필요합니다. 계속하시겠습니까?
pause
echo.
echo 스케줄러 등록 중...
echo.
${batchContent}
echo.
echo ==========================================
echo 완료! 등록된 작업을 확인하려면:
echo schtasks /query /tn "ReservationMacro_*"
echo ==========================================
pause`;

    setGeneratedCode(fullBatchContent);
  }, [selectedDates]);

  const downloadBatchFile = useCallback(() => {
    if (!generatedCode) return;
    
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservation_scheduler_${targetMonth.getFullYear()}_${String(targetMonth.getMonth() + 1).padStart(2, '0')}.bat`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedCode, targetMonth]);

  const getValidationMessage = useCallback(() => {
    if (selectedDates.length === 0) {
      return { message: '예약할 날짜 8개를 선택해주세요.', isError: false };
    } else if (selectedDates.length < 8) {
      return { message: `${selectedDates.length}개 선택됨. ${8 - selectedDates.length}개 더 선택해주세요.`, isError: false };
    } else if (selectedDates.length === 8) {
      return { message: '8개 날짜가 모두 선택되었습니다. 스케줄러를 생성할 수 있습니다.', isError: false };
    } else {
      return { message: '최대 8개까지만 선택할 수 있습니다.', isError: true };
    }
  }, [selectedDates.length]);

  const validation = getValidationMessage();

  const formatSelectedDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">주차 예약 시스템</h1>
        
        <div className="calendar-container">
          <Calendar
            selectedDates={selectedDates}
            onDateClick={handleDateClick}
            targetMonth={targetMonth}
          />
        </div>
        
        <div className="selection-panel">
          <h3 className="selection-title">선택된 날짜</h3>
          
          <div className="selected-dates">
            {selectedDates.map((date, index) => (
              <div key={index} className="date-tag">
                {formatSelectedDate(date)}
                <button 
                  className="remove-button"
                  onClick={() => removeDate(date)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <div className={`validation-message ${validation.isError ? 'error' : 'info'}`}>
            {validation.message}
          </div>
          
          <button
            className="generate-button"
            onClick={generateSchedulerCode}
            disabled={selectedDates.length !== 8}
          >
            스케줄러 배치 파일 생성
          </button>
        </div>
        
        {generatedCode && (
          <div className="code-section">
            <h3 className="code-title">생성된 배치 파일</h3>
            <pre className="code-block">{generatedCode}</pre>
            <button className="download-button" onClick={downloadBatchFile}>
              배치 파일 다운로드 (.bat)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
