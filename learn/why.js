/* Kalvi Kalanjiyam — "Why do we learn this?" banner for every subject, Classes 1–10 (Tamil + English).
   Shown at the top of each subject page. Band = class range: a (1–2) b (3–5) c (6–8) d (9–10). */
(function(){
'use strict';
const W = {
 tamil:{ why:['மொழிதான் சிந்தனையின் வாகனம். தாய்மொழியில் வலுவாக இருப்பவர் எந்தப் பாடத்தையும் எளிதாகப் புரிந்துகொள்வார்; தம் கருத்தை அச்சமின்றிச் சொல்வார்.','Language carries thought. Strong mother-tongue skills make every other subject easier and let you speak your mind with confidence.'],
  gain:['படிக்க, எழுத, பேச, கேட்கத் தெரிந்தால் புத்தகம், செய்தி, ஒப்பந்தம், கடிதம் எதையும் யாரையும் சார்ந்திராமல் புரிந்துகொள்ளலாம்; ஏமாற்றப்பட மாட்டீர்கள்.','If you can read, write, speak and listen well you can understand any book, news, contract or letter yourself, and no one can easily fool you.'],
  where:['வேலை நேர்காணல், அரசுத் தேர்வுகள் (TNPSC), எழுத்து, ஊடகம், சட்டம், ஆசிரியர் பணி, நம் பண்பாட்டையும் இலக்கியத்தையும் அறிதல்.','Interviews, government exams (TNPSC), writing, media, law, teaching, and knowing our culture and literature.'],
  future:['உலகின் மிகப் பழமையான உயிருள்ள மொழிகளில் ஒன்றைப் பேசுகிறீர்கள். தமிழ் + தொழில்நுட்பம் = எதிர்காலத்தின் பெரிய வாய்ப்பு.','You speak one of the oldest living languages. Tamil + technology is a big future opportunity.'],
  band:{a:['எழுத்துகளை அறிந்து சொற்களைப் படிக்கும் அடித்தளம்.','Learn the letters and read your first words.'],b:['வாக்கியம், இலக்கணம், கதை படித்துப் புரிதல்.','Sentences, grammar and understanding stories.'],c:['இலக்கணம், இலக்கியம், கட்டுரை — ஆழமான புரிதல்.','Grammar, literature and essays — deeper understanding.'],d:['திருக்குறள், செய்யுள், தேர்வுக்கான எழுத்துத் திறன்.','Thirukkural, poetry and exam-ready writing.']}},
 english:{ why:['ஆங்கிலம் உலகின் இணைப்பு மொழி. அறிவியல், இணையம், உயர்கல்வி, வேலை பெரும்பாலும் ஆங்கிலத்தில் உள்ளன.','English is the world\'s link language. Science, the internet, higher education and jobs mostly run in it.'],
  gain:['ஆங்கிலம் தெரிந்தால் உலகின் இலவசப் பாடங்கள், வீடியோக்கள், புத்தகங்களை நேரடியாகப் பயன்படுத்தலாம்; வெளிநாட்டவருடன் பேசலாம்.','With English you can use the world\'s free lessons, videos and books directly and talk to people anywhere.'],
  where:['உயர்கல்வி, IT வேலை, பயணம், சுற்றுலா, ஆராய்ச்சி, வெளிநாட்டு வாய்ப்புகள்.','Higher education, IT jobs, travel, tourism, research and overseas opportunities.'],
  future:['தமிழை விடாமல் ஆங்கிலத்தையும் கற்றவர் இரு உலகங்களை இணைக்கும் பாலம்.','Someone who keeps Tamil and learns English becomes a bridge between two worlds.'],
  band:{a:['எழுத்துகள், எளிய சொற்கள், பேச்சு.','Alphabet, simple words and speaking.'],b:['வாக்கியங்கள், படித்தல், எழுதுதல்.','Sentences, reading and writing.'],c:['இலக்கணம், கதை, கடிதம், கட்டுரை.','Grammar, stories, letters and essays.'],d:['தேர்வு எழுத்து, தெளிவான தொடர்பு.','Exam writing and clear communication.']}},
 maths:{ why:['கணிதம் "எவ்வளவு, எத்தனை, எப்படி மாறுகிறது" என்பதற்கான மொழி. சிந்திக்கும் திறனையும் தவறில்லாத முடிவெடுக்கும் திறனையும் தருகிறது.','Maths is the language of "how much, how many, how does it change". It builds thinking power and accurate decision-making.'],
  gain:['கடையில் விலை ஒப்பிடலாம், வட்டி/தள்ளுபடி கணக்கிடலாம், பணத்தை ஏமாறாமல் கையாளலாம்; புதிரையும் நிரலையும் தர்க்கத்துடன் தீர்க்கலாம்.','You can compare prices, work out interest and discounts, handle money without being cheated, and solve puzzles and code logically.'],
  where:['அன்றாடச் செலவு, கட்டுமானம், பொறியியல், கணினி, வங்கி, அறிவியல், விளையாட்டுப் புள்ளிவிவரம், ISRO.','Daily spending, construction, engineering, computing, banking, science, sports statistics, ISRO.'],
  future:['செயற்கை நுண்ணறிவு, தரவு அறிவியல், விண்வெளி — எல்லாவற்றின் அடித்தளம் கணிதம்.','AI, data science and space all stand on maths.'],
  band:{a:['எண்கள், எண்ணுதல், கூட்டல்-கழித்தல்.','Numbers, counting, adding and subtracting.'],b:['பெருக்கல், வகுத்தல், பின்னம், அளவீடு.','Multiplication, division, fractions and measures.'],c:['விகிதம், சதவீதம், இயற்கணிதம், வடிவியல்.','Ratio, percent, algebra and geometry.'],d:['சமன்பாடுகள், முக்கோணவியல், நிகழ்தகவு — உயர்கல்விக்கு அடித்தளம்.','Equations, trigonometry and probability — the base for higher studies.']}},
 science:{ why:['அறிவியல் "ஏன்? எப்படி?" என்று கேட்கும் பழக்கம். நம்பிக்கையை விட ஆதாரத்தை நம்ப வைக்கிறது.','Science is the habit of asking "why? how?". It teaches us to trust evidence, not rumours.'],
  gain:['நோய், மின்சாரம், வானிலை, உணவு, சுற்றுச்சூழல் பற்றிய வதந்திகளைச் சரிபார்க்கலாம்; பாதுகாப்பாக வாழலாம்; புதிய கண்டுபிடிப்புகளைச் செய்யலாம்.','You can test rumours about disease, electricity, weather, food and environment, live safely, and invent new things.'],
  where:['மருத்துவம், பொறியியல், விவசாயம், விண்வெளி, தொழில்நுட்பம், சுற்றுச்சூழல் காப்பு.','Medicine, engineering, farming, space, technology and protecting the environment.'],
  future:['தடுப்பூசி, சூரிய ஆற்றல், செயற்கைக்கோள், புதிய மருந்து — அடுத்த கண்டுபிடிப்பு உங்களுடையதாக இருக்கலாம்.','Vaccines, solar energy, satellites, new medicines — the next discovery may be yours.'],
  band:{a:['சுற்றி உள்ள உலகைப் பார்த்துக் கேள்வி கேட்டல்.','Observing the world around you and asking questions.'],b:['உயிர்கள், பொருட்கள், விசை, சுற்றுச்சூழல்.','Living things, materials, force and the environment.'],c:['அளவீடு, மின்சாரம், அணு, செல் — சோதனைகளுடன்.','Measurement, electricity, atoms and cells — with experiments.'],d:['இயற்பியல், வேதியியல், உயிரியல் ஆழம்; கணக்குகளும் சமன்பாடுகளும்.','Physics, chemistry and biology in depth, with calculations and equations.']}},
 social:{ why:['சமூக அறிவியல் நாம் யார், எங்கிருந்து வந்தோம், நாடும் உலகமும் எப்படி இயங்குகிறது என்று கற்பிக்கிறது.','Social science tells who we are, where we came from and how our country and world work.'],
  gain:['வரலாற்றிலிருந்து பாடம் கற்கலாம்; வரைபடம், அரசு, பொருளாதாரம் புரிந்து பொறுப்புள்ள குடிமகனாக வாழலாம்; வாக்குரிமையை அறிவுடன் பயன்படுத்தலாம்.','You learn from history, understand maps, government and the economy, and become a responsible citizen who votes wisely.'],
  where:['IAS/TNPSC தேர்வுகள், சட்டம், பத்திரிகை, அரசியல், சமூகப் பணி, சுற்றுலா.','IAS/TNPSC exams, law, journalism, politics, social work, tourism.'],
  future:['நாட்டை வழிநடத்தும் தலைவர்கள் வரலாற்றையும் மக்களையும் புரிந்தவர்கள்.','Leaders who guide a nation understand its history and people.'],
  band:{a:['','']  ,b:['நம் ஊர், மாநிலம், நாடு, சுற்றுச்சூழல்.','Our town, state, country and environment.'],c:['வரலாறு, புவியியல், குடிமையியல், பொருளியல்.','History, geography, civics and economics.'],d:['ஆழமான வரலாறு, அரசியலமைப்பு, பொருளாதாரம்.','Deeper history, the Constitution and economics.']}},
 thinking:{ why:['சிந்தனைப் பயிற்சி புதிருக்கும் வாழ்க்கைச் சிக்கலுக்கும் வழி காணும் மூளைத் தசையை வலுப்படுத்துகிறது.','Thinking practice strengthens the brain "muscle" that finds a way through puzzles and real problems.'],
  gain:['வடிவம், வரிசை, தர்க்கம் தெரிந்தவர் தேர்வு, நேர்காணல், நிரலாக்கத்தில் முன்னணியில் இருப்பார்.','Those who know patterns, order and logic do well in exams, interviews and programming.'],
  where:['போட்டித் தேர்வுகள், கணினி நிரல், ஆராய்ச்சி, வணிகம், வாழ்க்கை முடிவுகள்.','Competitive exams, coding, research, business and life decisions.'],
  future:['சிக்கலைத் தீர்ப்பவர்களுக்கு எப்போதும் வேலை உண்டு.','Problem solvers are always in demand.'],
  band:{a:['வடிவம், நிறம், ஒப்பிடுதல்.','Shapes, colours and comparing.'],b:['வரிசை, புதிர், தர்க்கம்.','Sequences, puzzles and logic.'],c:['தர்க்கம், வடிவ ஒப்புமை, கணக்குப் புதிர்.','Logic, pattern analogies and number puzzles.'],d:['போட்டித் தேர்வு பாணித் தர்க்கம்.','Competitive-exam style reasoning.']}},
 values:{ why:['நல்ல மதிப்பெண் மட்டுமல்ல, நல்ல மனிதராக வாழ்வதும் கல்வியின் நோக்கம். நேர்மை, உழைப்பு, கருணை, பணம், உடல்நலம் பற்றிய அறிவு வாழ்க்கை முழுவதும் உதவும்.','Education is not only marks but becoming a good person. Honesty, effort, kindness, money sense and health knowledge help for life.'],
  gain:['பணத்தைச் சேமிக்கவும், ஆபத்தைத் தவிர்க்கவும், நல்ல நண்பர்களைத் தேர்ந்தெடுக்கவும், மன அழுத்தத்தைச் சமாளிக்கவும் தெரியும்.','You learn to save money, avoid danger, choose good friends and handle stress.'],
  where:['குடும்பம், பணியிடம், சமூக உறவுகள், தனிப்பட்ட நிதி, உடல்-மன நலம்.','Family, workplace, relationships, personal finance and body-mind health.'],
  future:['நம்பிக்கைக்குரியவர்களே தலைவர்களாகவும் தொழில்முனைவோராகவும் வளர்கிறார்கள்.','Trustworthy people grow into leaders and entrepreneurs.'],
  band:{a:['நல்ல பழக்கங்கள், பாதுகாப்பு, சுத்தம்.','Good habits, safety and cleanliness.'],b:['நட்பு, நேர்மை, பணத்தின் மதிப்பு.','Friendship, honesty and the value of money.'],c:['பணம், இணையப் பாதுகாப்பு, உடல்நலம்.','Money, online safety and health.'],d:['வாழ்க்கைத் திட்டம், தொழில் தேர்வு, மன உறுதி.','Life planning, career choice and resilience.']}},
 nation:{ why:['நம் நாட்டின் அரசியலமைப்பு, உரிமை, கடமை, பெருமையை அறிந்தால் நாட்டை நேசிக்கவும் முன்னேற்றவும் முடியும்.','Knowing our Constitution, rights, duties and heritage helps us love and improve our nation.'],
  gain:['உரிமையைக் கேட்கவும், கடமையைச் செய்யவும், தவறைக் கேள்வி கேட்கவும் தெரியும்.','You learn to ask for rights, do your duty and question what is wrong.'],
  where:['வாக்களிப்பு, அரசு சேவைகள், தேர்வுகள், சமூகப் பங்களிப்பு.','Voting, government services, exams and community service.'],
  future:['நாளைய தலைவர்கள், அதிகாரிகள், விஞ்ஞானிகள் இன்றைய மாணவர்களே.','Tomorrow\'s leaders, officers and scientists are today\'s students.'],
  band:{a:['நம் கொடி, நாடு, தலைவர்கள்.','Our flag, country and leaders.'],b:['மாநிலங்கள், விழாக்கள், விடுதலை வீரர்கள்.','States, festivals and freedom fighters.'],c:['அரசியலமைப்பு, உரிமை-கடமை.','The Constitution, rights and duties.'],d:['ஜனநாயகம், அரசு அமைப்பு, குடிமகன் பொறுப்பு.','Democracy, government structure and civic responsibility.']}},
 languages:{ why:['பல மொழி தெரிந்தால் பல மக்களுடன் பழகவும் பல வாய்ப்புகளைப் பெறவும் முடியும். மூளையும் வலுவாகும்.','More languages mean more people to meet and more opportunities. It also strengthens the brain.'],
  gain:['இந்தி, சமஸ்கிருதம் போன்றவற்றை அறிந்தால் இந்தியாவில் எங்கும் எளிதாகப் பழகலாம்; தேர்வுகளிலும் உதவும்.','Knowing Hindi, Sanskrit and others lets you move easily across India and helps in exams.'],
  where:['பயணம், மத்திய அரசுத் தேர்வுகள், வணிகம், பண்பாட்டுப் புரிதல்.','Travel, central-government exams, business and cultural understanding.'],
  future:['பன்மொழி அறிவு உலகளாவிய வேலைகளுக்குப் பாலம்.','Multilingual skill is a bridge to global jobs.'],
  band:{a:['எளிய சொற்கள், வணக்கம் போன்றவை.','Simple words and greetings.'],b:['அடிப்படைச் சொற்கள், எழுத்துகள்.','Basic words and letters.'],c:['எளிய வாக்கியங்கள், உரையாடல்.','Simple sentences and conversation.'],d:['படித்துப் புரிதல், எழுதுதல்.','Reading comprehension and writing.']}},
 beyond:{ why:['பாடநூலைத் தாண்டி உலகம் பெரியது. கோடிங், பணம், AI, தொழில் முனைவு போன்ற இன்றைய திறன்களை இங்கே கற்கிறீர்கள்.','The world is bigger than the textbook. Here you pick up today\'s skills: coding, money, AI and enterprise.'],
  gain:['பள்ளி முடிந்ததும் வேலை அல்லது தொழிலுக்குத் தேவையான நடைமுறைத் திறன்கள் கிடைக்கும்.','You gain practical skills needed for a job or business right after school.'],
  where:['IT வேலை, சுயதொழில், உயர்கல்வி, ஃப்ரீலான்ஸ், புதிய தொழில்நுட்பம்.','IT jobs, self-employment, higher education, freelancing and new technology.'],
  future:['புதிய தொழில்நுட்பத்தை உருவாக்கப் போகிறவர்கள் நீங்கள்தான்.','You are the ones who will build the next technology.'],
  band:{b:['ஆர்வத்தைத் தூண்டும் அறிமுகம்.','A curiosity-sparking introduction.'],c:['நடைமுறைத் திறன்கள்.','Practical skills.'],d:['தொழில் & உயர்கல்வி தயாரிப்பு.','Career and higher-study preparation.']}}
};
const band = c => c <= 2 ? 'a' : c <= 5 ? 'b' : c <= 8 ? 'c' : 'd';
window.KALVI_WHYSUBJ = function(subjectId, cls, lang){
  const w = W[subjectId]; if(!w) return '';
  const i = lang === 'ta' ? 0 : 1, T = (a) => a[i];
  const b = (w.band[band(+cls)] || w.band.b || w.band.c || ['','']);
  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const row = (ic, h, t) => t ? `<p style="margin:6px 0"><b>${ic} ${h}</b><br>${e(t)}</p>` : '';
  const L = lang === 'ta' ? ['ஏன் படிக்கிறோம்?','படித்தால் என்ன நடக்கும்?','எங்கே உதவும்?','எதிர்காலம்','இந்த வகுப்பில்'] : ['Why do we learn this?','What happens when you learn it?','Where does it help?','Your future','In this class'];
  return `<details open style="background:#fff8e1;border:1px solid #f0d58a;border-left:6px solid #f5a623;border-radius:12px;padding:10px 14px;margin:0 0 14px"><summary style="cursor:pointer;font-weight:700">🌟 ${L[0]}</summary>`
    + row('🎯', L[0], T(w.why)) + row('📘', L[4], T(b)) + row('🌱', L[1], T(w.gain)) + row('📍', L[2], T(w.where)) + row('🚀', L[3], T(w.future)) + '</details>';
};
})();
