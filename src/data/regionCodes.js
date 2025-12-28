/**
 * 법정동코드 (앞 5자리)
 * 국토교통부 실거래가 API 조회용
 */

export const REGION_CODES = {
  '서울특별시': {
    code: '11',
    districts: {
      '강남구': '11680',
      '강동구': '11740',
      '강북구': '11305',
      '강서구': '11500',
      '관악구': '11620',
      '광진구': '11215',
      '구로구': '11530',
      '금천구': '11545',
      '노원구': '11350',
      '도봉구': '11320',
      '동대문구': '11230',
      '동작구': '11590',
      '마포구': '11440',
      '서대문구': '11410',
      '서초구': '11650',
      '성동구': '11200',
      '성북구': '11290',
      '송파구': '11710',
      '양천구': '11470',
      '영등포구': '11560',
      '용산구': '11170',
      '은평구': '11380',
      '종로구': '11110',
      '중구': '11140',
      '중랑구': '11260',
    },
  },
  '경기도': {
    code: '41',
    districts: {
      '수원시 장안구': '41111',
      '수원시 권선구': '41113',
      '수원시 팔달구': '41115',
      '수원시 영통구': '41117',
      '성남시 수정구': '41131',
      '성남시 중원구': '41133',
      '성남시 분당구': '41135',
      '의정부시': '41150',
      '안양시 만안구': '41171',
      '안양시 동안구': '41173',
      '부천시': '41190',
      '광명시': '41210',
      '평택시': '41220',
      '동두천시': '41250',
      '안산시 상록구': '41271',
      '안산시 단원구': '41273',
      '고양시 덕양구': '41281',
      '고양시 일산동구': '41285',
      '고양시 일산서구': '41287',
      '과천시': '41290',
      '구리시': '41310',
      '남양주시': '41360',
      '오산시': '41370',
      '시흥시': '41390',
      '군포시': '41410',
      '의왕시': '41430',
      '하남시': '41450',
      '용인시 처인구': '41461',
      '용인시 기흥구': '41463',
      '용인시 수지구': '41465',
      '파주시': '41480',
      '이천시': '41500',
      '안성시': '41550',
      '김포시': '41570',
      '화성시': '41590',
      '광주시': '41610',
      '양주시': '41630',
      '포천시': '41650',
      '여주시': '41670',
    },
  },
  '부산광역시': {
    code: '26',
    districts: {
      '중구': '26110',
      '서구': '26140',
      '동구': '26170',
      '영도구': '26200',
      '부산진구': '26230',
      '동래구': '26260',
      '남구': '26290',
      '북구': '26320',
      '해운대구': '26350',
      '사하구': '26380',
      '금정구': '26410',
      '강서구': '26440',
      '연제구': '26470',
      '수영구': '26500',
      '사상구': '26530',
      '기장군': '26710',
    },
  },
  '인천광역시': {
    code: '28',
    districts: {
      '중구': '28110',
      '동구': '28140',
      '미추홀구': '28177',
      '연수구': '28185',
      '남동구': '28200',
      '부평구': '28237',
      '계양구': '28245',
      '서구': '28260',
      '강화군': '28710',
      '옹진군': '28720',
    },
  },
  '대구광역시': {
    code: '27',
    districts: {
      '중구': '27110',
      '동구': '27140',
      '서구': '27170',
      '남구': '27200',
      '북구': '27230',
      '수성구': '27260',
      '달서구': '27290',
      '달성군': '27710',
    },
  },
  '대전광역시': {
    code: '30',
    districts: {
      '동구': '30110',
      '중구': '30140',
      '서구': '30170',
      '유성구': '30200',
      '대덕구': '30230',
    },
  },
  '광주광역시': {
    code: '29',
    districts: {
      '동구': '29110',
      '서구': '29140',
      '남구': '29155',
      '북구': '29170',
      '광산구': '29200',
    },
  },
  '울산광역시': {
    code: '31',
    districts: {
      '중구': '31110',
      '남구': '31140',
      '동구': '31170',
      '북구': '31200',
      '울주군': '31710',
    },
  },
  '세종특별자치시': {
    code: '36',
    districts: {
      '세종시': '36110',
    },
  },
};

/**
 * 지역코드로 지역명 찾기
 */
export function getRegionName(regionCode) {
  for (const [city, data] of Object.entries(REGION_CODES)) {
    for (const [district, code] of Object.entries(data.districts)) {
      if (code === regionCode) {
        return { city, district, fullName: `${city} ${district}` };
      }
    }
  }
  return null;
}

/**
 * 지역명으로 지역코드 찾기
 */
export function findRegionCode(searchText) {
  const search = searchText.toLowerCase().replace(/\s/g, '');
  const results = [];

  for (const [city, data] of Object.entries(REGION_CODES)) {
    for (const [district, code] of Object.entries(data.districts)) {
      const fullName = `${city}${district}`.toLowerCase().replace(/\s/g, '');
      if (fullName.includes(search) || search.includes(district.replace(/\s/g, ''))) {
        results.push({ city, district, code, fullName: `${city} ${district}` });
      }
    }
  }

  return results;
}

/**
 * 모든 지역 목록 (검색/선택용)
 */
export function getAllRegions() {
  const regions = [];

  for (const [city, data] of Object.entries(REGION_CODES)) {
    for (const [district, code] of Object.entries(data.districts)) {
      regions.push({
        city,
        district,
        code,
        fullName: `${city} ${district}`,
        label: `${city} ${district}`,
        value: code,
      });
    }
  }

  return regions.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export default REGION_CODES;
