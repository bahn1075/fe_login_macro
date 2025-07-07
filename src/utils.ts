// 배치 파일 생성 유틸리티
export const generateBatchFile = (selectedDates: Date[]): string => {
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

  return `@echo off
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
};

// 날짜 유효성 검증
export const validateDateSelection = (dates: Date[]): { isValid: boolean; message: string } => {
  if (dates.length === 0) {
    return { isValid: false, message: '예약할 날짜 8개를 선택해주세요.' };
  }
  
  if (dates.length < 8) {
    return { isValid: false, message: `${dates.length}개 선택됨. ${8 - dates.length}개 더 선택해주세요.` };
  }
  
  if (dates.length > 8) {
    return { isValid: false, message: '최대 8개까지만 선택할 수 있습니다.' };
  }
  
  return { isValid: true, message: '8개 날짜가 모두 선택되었습니다. 스케줄러를 생성할 수 있습니다.' };
};

// 파일 다운로드 헬퍼
export const downloadFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
