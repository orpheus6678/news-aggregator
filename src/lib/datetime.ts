const banglaDateTimeRegex =
  /^([০-৯]{2}):([০-৯]{2}), (রবিবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শুক্রবার|শনিবার), ([০-৯]{2}) (জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর), ([০-৯]{4})$/

export function banglaDateTimetoEnglish(dateTime: string) {
  const matches = dateTime.match(banglaDateTimeRegex)
  if (!matches) throw new Error("invalid datetime string")

  let [_, HH, MM, _day, dd, month, yyyy] = matches as any[]

  HH = parseInt(banglaDigitsToEnglish(HH))
  MM = parseInt(banglaDigitsToEnglish(MM))
  dd = parseInt(banglaDigitsToEnglish(dd))
  let [__, mm] = banglaMonthParser(month)
  yyyy = parseInt(banglaDigitsToEnglish(yyyy))

  return new Date(yyyy, mm, dd, HH, mm)
}

const banglaDigitsToEnglish = (number: string) =>
  number.replace(/[০-৯]/g, (c) => {
    const num = "০১২৩৪৫৬৭৮৯".indexOf(c)
    if (num >= 0) return String(num)
    else throw new Error("invalid digit")
  })

function banglaMonthParser(month: string): [string, number] {
  const months = [
    ["জানুয়ারি", "January"],
    ["ফেব্রুয়ারি", "February"],
    ["মার্চ", "March"],
    ["এপ্রিল", "April"],
    ["মে", "May"],
    ["জুন", "June"],
    ["জুলাই", "July"],
    ["আগস্ট", "August"],
    ["সেপ্টেম্বর", "September"],
    ["অক্টোবর", "October"],
    ["নভেম্বর", "November"],
    ["ডিসেম্বর", "December"],
  ]

  for (let i = 0; i < months.length; i++) {
    const [bn, en] = months[i]
    if (month === bn) return [en, i]
  }

  throw new Error("invalid month")
}

function banglaDayParser(day: string): [string, number] {
  const days = [
    ["রবিবার", "Sunday"],
    ["সোমবার", "Monday"],
    ["মঙ্গলবার", "Tuesday"],
    ["বুধবার", "Wednesday"],
    ["বৃহস্পতিবার", "Thursday"],
    ["শুক্রবার", "Friday"],
    ["শনিবার", "Saturday"],
  ]

  for (let i = 0; i < days.length; i++) {
    const [bn, en] = days[i]
    if (day === bn) return [en, i]
  }

  throw new Error("invalid day")
}
