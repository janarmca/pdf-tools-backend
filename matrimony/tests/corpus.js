// [text, expected] expected: true = must be blocked, false = must pass
module.exports = {
  block: [
    '9876543210', '98765 43210', '98765-43210', '+91 98765 43210', '9.8.7.6.5.4.3.2.1.0', '9 8 7 6 5 4 3 2 1 0',
    '９８７６５４３２１０', '9⃣8⃣7⃣6⃣5⃣4⃣3⃣2⃣1⃣0⃣', '௯௮௭௬௫௪௩௨௧௦', '९८७६५४३२१०', '೯೮೭೬೫೪೩೨೧೦', '౯౮౭౬౫౪౩౨౧౦',
    'nine eight seven six five four three two one zero', 'NINE EIGHT SEVEN SIX FIVE FOUR THREE TWO ONE ZERO',
    'nineeightsevensixfivefourthreetwoone', '9 eight 7 six 5 four 3 two 1 zero',
    'ஒன்பது எட்டு ஏழு ஆறு ஐந்து நான்கு மூன்று இரண்டு ஒன்று பூஜ்யம்', 'ஒம்போது எட்டு ஏழு ஆறு அஞ்சு நாலு மூணு ரெண்டு ஒண்ணு சைபர்',
    'onbathu ettu ezhu aaru ainthu naangu moondru irandu ondru poojyam', 'nau aath saat chhe paanch chaar teen do ek shunya',
    'नौ आठ सात छह पांच चार तीन दो एक शून्य', 'ombattu entu elu aaru aidu naalku mooru eradu ondu sonne',
    'తొమ్మిది ఎనిమిది ఏడు ఆరు ఐదు నాలుగు మూడు రెండు ఒకటి సున్నా', 'double nine eight seven six five four three two one',
    'triple nine eight seven six five four', '9 8 7 o 5 4 3 2 1 0', '98765o3210', '9876 five 43210',
    'call me on 9 8 7 6 5 4 3 2 1 0', 'my number is 98765.43210', '9❤8❤7❤6❤5❤4❤3❤2❤1❤0',
    'abc@gmail.com', 'abc (at) gmail (dot) com', 'abc at the rate gmail dot com', 'raja [at] yahoo [dot] in', 'mail me raja at gmail',
    'g m a i l', 'g.m@il', 'gm4il', 'ஜிமெயில் id raja123', 'raja@ ya', 'email id', 'e-mail kudunga', 'my mail', 'dot com',
    'www.example', 'http://x.y', 'https://wa.me/919876543210', 't.me/raja', 'bit.ly/abc', 'instagram', 'my insta', 'insta id raja', 'fb la irukken',
    'W H A T S A P P', 'wh4tsapp', 'w.h.a.t.s.a.p.p', 'whatsapp number', 'watsapp la pesalam', 'telegram', 'வாட்ஸ்அப் number', 'வாட்சப்பில் வாங்க',
    'व्हाट्सएप पर बात करें', 'ವಾಟ್ಸಪ್ ನಲ್ಲಿ ಮಾತಾಡೋಣ', 'వాట్సాప్ లో మాట్లాడదాం', 'டெலிகிராம்', 'இன்ஸ்டா id',
    'phone number', 'ph no', 'mob no', 'contact no', 'unga number kudunga', 'your number', 'send number', 'give me your phone', 'share the mobile',
    'call me', 'call you', 'give me a call', 'missed call', 'miss call kudu', 'video call', 'on call pesalam', 'over phone',
    'உங்கள் நம்பர் கொடுங்க', 'எண்ணை கொடு', 'தொலைபேசி எண்', 'மொபைல் எண்', 'போன் பண்ணுங்க', 'கால் பண்ணுங்க', 'மிஸ்டு கால்',
    'नंबर दो', 'फोन करो', 'ಫೋನ್ ನಂಬರ್', 'నంబర్ ఇవ్వండి', 'కాల్ చేయి', 'ನಂಬರ್ ಕೊಡಿ',
    'ok 9876543210 ok', 'Hi, 98 76 54 32 10 this is me', '9-8-7-6-5-4-3-2-1-0', '98 76 5432 10', 'one two three four five six seven eight',
    'sixty five?? 9876 543210', 'W h a t s  a p p', 'Gmail', 'yahoo mail', 'outlook', 'ig: raja', 'dm me', 'snap id'
  ],
  pass: [
    'வணக்கம், உங்கள் profile பிடித்திருந்தது', 'Namaste, we liked your profile', 'ನಮಸ್ಕಾರ, ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಇಷ್ಟವಾಯಿತು', 'నమస్కారం మీ ప్రొఫైల్ నచ్చింది',
    'मेरी उम्र 28 साल है', 'I am 28 years old and 5 ft 8 in', 'Born on 12-04-1995 in Salem', 'DOB 12/04/1995', '12 04 1995', 'Studied 2012-2016 at PSG', '2012 2016',
    'நான் 28 வயது, 5 அடி 8 அங்குலம்', 'salary 50000 per month', 'Pincode 636001, door 12', 'We have two brothers and one sister', 'one of them is married',
    'My father is a retired teacher', 'அப்பா ஆசிரியர், அம்மா இல்லத்தரசி', 'Kulam: Devanga, Gotra: Kashyapa', 'நட்சத்திரம் பூரம், ராசி சிம்மம்',
    'Can we meet at the temple on Sunday?', 'Please tell me about your family', 'What time works for the family visit?', 'I work at Infosys as a software engineer',
    'Number of siblings: 2', 'Lucky number 7', 'Phoneme is a sound', 'we will talk in person', 'நாளை காலை 10 மணிக்கு கோயிலில் சந்திக்கலாம்', 'the cost is 1.2 crore', 'He lives in Salem, Tamil Nadu',
    'ok', 'Thank you so much', 'பெற்றோரிடம் பேசிவிட்டு சொல்கிறேன்', 'ಧನ್ಯವಾದಗಳು', 'చాలా సంతోషం', 'धन्यवाद', 'I like cooking and reading', 'whats up', 'Hello, how are you', 'Good morning',
    'Height 172 cm weight 70 kg', 'We are 5 members in family', 'Born in 1995 and my sister was born in 1998', 'It is 3 pm now', 'seven days later', 'ஏழு நாட்களுக்குப் பிறகு', 'come tomorrow at five', 'contact the elders first',
    'அவர் போன்ற குணம் உள்ளவர்', 'Master degree in commerce', 'mobile engineer? no, I am a civil engineer'
  ]
};
