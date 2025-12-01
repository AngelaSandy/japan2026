import React, { useState, useEffect } from 'react';
import { Car, Map, Calculator, Plus, Trash2, Users, AlertTriangle, Coffee, Bed, Utensils, Camera, MapPin, Plane, Sun, CloudSnow, CloudRain, Cloud, Navigation, ExternalLink, Clock, LogOut, Share2, X, Info, Play, ArrowRight, CheckCircle } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from "firebase/firestore";

// --- 1. 您的 Firebase 設定檔 (已整合) ---
// 請確保您的 Firebase Console 已開啟 Authentication (匿名登入) 與 Firestore Database (測試模式)
const firebaseConfig = {
  apiKey: "AIzaSyAID4qUYZWNVbd5AydVi5ZQLKfMEd3Nz3o",
  authDomain: "kyushu-8c5ff.firebaseapp.com",
  projectId: "kyushu-8c5ff",
  storageBucket: "kyushu-8c5ff.firebasestorage.app",
  messagingSenderId: "571592240846",
  appId: "1:571592240846:web:97a225acb5a03bdd5e6a9f",
  measurementId: "G-W9M2VNEB6Y"
};

// 初始化 Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase 初始化錯誤:", e);
}

// --- Welcome Screen Component ---
const WelcomeScreen = ({ onStart, isConnected }) => (
  <div className="h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-700">
    <div className="bg-white/20 p-6 rounded-full mb-6 backdrop-blur-md shadow-xl animate-bounce">
      <Car className="w-16 h-16 text-white" />
    </div>
    <h1 className="text-3xl font-bold mb-2 tracking-tight">福岡自駕四人行</h1>
    <p className="text-blue-100 mb-8 text-lg">1/8 - 1/12 • Sandy, 阿幫, 720, 水姑娘</p>
    
    <div className="space-y-4 w-full max-w-xs">
        <button 
          onClick={onStart}
          className="w-full bg-white text-blue-700 py-3.5 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center group"
        >
          開始旅程 <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
        <div className={`text-xs flex items-center justify-center gap-1.5 ${isConnected ? "text-green-300" : "text-yellow-300"}`}>
           {isConnected ? <CheckCircle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
           {isConnected ? "已連線至專屬資料庫" : "正在連線至 Firebase..."}
        </div>
    </div>
  </div>
);

const KyushuTripApp = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ payer: 'Sandy', amount: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const members = ['Sandy', '阿幫', '720', '水姑娘'];

  // --- 2. Firebase Authentication & Data Sync ---
  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }

    // 匿名登入
    signInAnonymously(auth).then(() => {
        console.log("已匿名登入 Firebase");
    }).catch((error) => {
        console.error("登入失敗 (請確認 Firebase Console Authentication 是否開啟匿名登入):", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    // 監聽 'expenses' 集合
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.error("讀取資料失敗 (請確認 Firestore 規則):", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // --- 3. Action Handlers ---
  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description) return;
    
    // 寫入資料
    if (db && user) {
        try {
          await addDoc(collection(db, 'expenses'), {
            payer: newExpense.payer,
            amount: Number(newExpense.amount),
            description: newExpense.description,
            date: new Date().toLocaleDateString('zh-TW', {month: 'numeric', day: 'numeric'}),
            createdAt: Date.now()
          });
        } catch (e) {
          console.error("寫入失敗:", e);
          alert("無法寫入資料，請檢查 Firestore 權限設定 (是否為 Test Mode?)");
        }
    } else {
        // 離線備案
        setExpenses(prev => [{
            id: Date.now(),
            payer: newExpense.payer,
            amount: Number(newExpense.amount),
            description: newExpense.description,
            date: new Date().toLocaleDateString('zh-TW', {month: 'numeric', day: 'numeric'}),
            createdAt: Date.now()
        }, ...prev]);
    }
    setNewExpense({ ...newExpense, amount: '', description: '' });
  };

  const handleDeleteExpense = async (id) => {
    if (db && user) {
        try {
          await deleteDoc(doc(db, 'expenses', id));
        } catch (e) {
          console.error("刪除失敗:", e);
        }
    } else {
        setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const calculateSplit = () => {
    const total = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const perPerson = total / 4;
    const paidByMember = {};
    members.forEach(m => paidByMember[m] = 0);
    expenses.forEach(e => paidByMember[e.payer] += Number(e.amount));
    const balances = members.map(m => ({
      name: m,
      paid: paidByMember[m],
      balance: paidByMember[m] - perPerson
    }));
    return { total, perPerson, balances };
  };

  const { total, perPerson, balances } = calculateSplit();

  // --- 4. Google Maps Navigation Helper ---
  const openMap = (location) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, '_blank');
  };

  // --- 5. Data: Hotels ---
  const hotels = [
    {
      date: '1/8 (一晚)',
      name: 'KOKO HOTEL Premier Kumamoto',
      location: '熊本',
      link: 'https://www.booking.com/Share-REqIYC',
      priceLevel: '$$',
      checkIn: '15:00',
      checkOut: '11:00',
      note: '位於熊本市區，步行可達勝烈亭與商店街'
    },
    {
      date: '1/9 (一晚)',
      name: '湯布院燈之宿旅館',
      location: '由布院 (Kawakami 3639-1)',
      link: 'https://www.booking.com/Share-o4Ex9K',
      priceLevel: '$$$$',
      checkIn: '15:00',
      checkOut: '10:00',
      note: '享受一泊二食，建議 17:00 前抵達 Check-in'
    },
    {
      date: '1/10 - 1/12 (兩晚)',
      name: 'Randor Residential Hotel Fukuoka Annex',
      location: '福岡 (Chuo-ku Hirao 1-11-7)',
      link: 'https://www.booking.com/Share-CifT4X',
      priceLevel: '$$$',
      checkIn: '15:00',
      checkOut: '11:00',
      note: '連住兩晚，請確認是否有停車場'
    }
  ];

  // --- 6. Data: Itinerary ---
  const itinerary = [
    {
      date: '1/8 (三)',
      title: '抵達福岡直奔熊本',
      icon: <Plane className="w-5 h-5 text-blue-500" />,
      weather: { temp: '4°C ~ 11°C', condition: 'Sunny', icon: <Sun className="w-4 h-4 text-orange-400" /> },
      route: '機場 ➔ 熊本',
      details: [
        { time: '06:45', event: '台北出發 (IT240)', type: 'transport' },
        { time: '10:00', event: '抵達福岡機場 & 取車', type: 'transport', nav: 'Fukuoka Airport International Terminal' },
        { time: '12:00', event: '開車前往熊本 (約1.5~2小時)', type: 'transport' },
        { time: '14:30', event: '熊本城 & 櫻之馬場城彩苑', type: 'sight', nav: 'Kumamoto Castle' },
        { time: '18:00', event: '晚餐：勝烈亭豬排', type: 'food', nav: 'Katsuretsutei Shinshigai' },
        { time: '20:00', event: '入住 KOKO HOTEL', type: 'hotel', nav: 'KOKO HOTEL Premier Kumamoto', note: 'Booking已訂' },
      ]
    },
    {
      date: '1/9 (四)',
      title: '阿蘇火山與前往由布院',
      icon: <Camera className="w-5 h-5 text-green-600" />,
      weather: { temp: '-2°C ~ 5°C', condition: 'Snow', icon: <CloudSnow className="w-4 h-4 text-blue-300" /> },
      route: '熊本 ➔ 阿蘇 ➔ 由布院',
      details: [
        { time: '09:00', event: '出發前往阿蘇 (注意路面結冰)', type: 'transport' },
        { time: '10:30', event: '阿蘇草千里 & 火山口', type: 'sight', nav: 'Kusasenri' },
        { time: '12:30', event: '大觀峰 (眺望阿蘇五岳絕景)', type: 'sight', nav: 'Daikanbo' },
        { time: '16:00', event: '湯之坪街道散策', type: 'sight', nav: 'Yunotsubo Street' },
        { time: '18:00', event: '入住 湯布院燈之宿旅館', type: 'hotel', nav: 'Yufuin Akari no Yado', note: 'Booking已訂' },
      ]
    },
    {
      date: '1/10 (五)',
      title: '九重夢大吊橋與福岡',
      icon: <Coffee className="w-5 h-5 text-amber-600" />,
      weather: { temp: '2°C ~ 8°C', condition: 'Cloudy', icon: <Cloud className="w-4 h-4 text-gray-400" /> },
      route: '由布院 ➔ 九重夢 ➔ 福岡',
      details: [
        { time: '10:00', event: '金鱗湖晨霧', type: 'sight', nav: 'Kinrin Lake' },
        { time: '11:30', event: '九重夢大吊橋', type: 'sight', nav: 'Kokonoe Yume Otsurihashi' },
        { time: '13:30', event: '午餐：日田炒麵 (想夫恋)', type: 'food', nav: 'Sofuren Hita' },
        { time: '15:30', event: '太宰府天滿宮', type: 'sight', nav: 'Dazaifu Tenmangu' },
        { time: '19:00', event: '抵達福岡，入住 Randor Hotel', type: 'hotel', nav: 'Randor Residential Hotel Fukuoka Annex', note: 'Booking已訂' },
      ]
    },
    {
      date: '1/11 (六)',
      title: '系島海景與購物日',
      icon: <MapPin className="w-5 h-5 text-red-500" />,
      weather: { temp: '5°C ~ 12°C', condition: 'Sunny', icon: <Sun className="w-4 h-4 text-orange-400" /> },
      route: '福岡 ➔ 系島 ➔ 福岡',
      details: [
        { time: '10:00', event: '系島：櫻井二見浦 夫婦岩', type: 'sight', nav: 'Sakurai Futamigaura' },
        { time: '12:30', event: '海邊咖啡廳 (Sunset Cafe)', type: 'food', nav: 'Sunset Cafe Itoshima' },
        { time: '15:00', event: '鳥栖 Premium Outlets', type: 'shop', nav: 'Tosu Premium Outlets' },
        { time: '19:00', event: '晚餐：博多牛腸鍋', type: 'food' },
        { time: '21:00', event: '返回 Randor Hotel 休息', type: 'hotel', nav: 'Randor Residential Hotel Fukuoka Annex', note: 'Booking已訂' },
      ]
    },
    {
      date: '1/12 (日)',
      title: '最後採買與返程',
      icon: <Users className="w-5 h-5 text-purple-500" />,
      weather: { temp: '6°C ~ 11°C', condition: 'Rain', icon: <CloudRain className="w-4 h-4 text-blue-400" /> },
      route: '福岡市區 ➔ 機場',
      details: [
        { time: '10:00', event: '博多運河城 / Lalaport', type: 'shop', nav: 'Lalaport Fukuoka' },
        { time: '12:30', event: '最後採購 (藥妝/電器)', type: 'shop' },
        { time: '14:00', event: '前往機場附近加油、還車', type: 'transport', nav: 'Fukuoka Airport International Terminal' },
        { time: '16:55', event: '福岡起飛 (AK1511)', type: 'transport' },
        { time: '18:30', event: '抵達台北', type: 'transport' },
      ]
    }
  ];

  if (showWelcome) {
    return <WelcomeScreen onStart={() => setShowWelcome(false)} isConnected={!!user} />;
  }

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col font-sans overflow-hidden border-x border-gray-200 relative">
      
      {/* Share Instructions Modal */}
      {showShareModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full relative">
                <button 
                    onClick={() => setShowShareModal(false)}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center text-center">
                    <div className="bg-blue-100 p-3 rounded-full mb-4">
                        <Share2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">如何分享？</h3>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        您的 App 已經部署到 Vercel 了嗎？
                        <br/>
                        如果是，直接把 Vercel 的網址傳給朋友即可！
                    </p>
                    <button 
                        onClick={() => setShowShareModal(false)}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        好的
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-600 text-white p-4 pt-8 shadow-md z-10 flex justify-between items-start">
        <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
            <Car className="w-6 h-6" />
            福岡自駕四人行
            </h1>
            <p className="text-blue-100 text-sm mt-1">1/8 - 1/12 • 4人 • {total.toLocaleString()}円</p>
        </div>
        <button 
            onClick={() => setShowShareModal(true)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
            title="如何分享？"
        >
            <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20">
        
        {/* TAB: 行程 */}
        {activeTab === 'itinerary' && (
          <div className="p-4 space-y-4 animate-in slide-in-from-right duration-300">
            {itinerary.map((day, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full mr-2">{day.date}</span>
                    <span className="font-bold text-gray-800">{day.title}</span>
                  </div>
                  {/* Weather Badge */}
                  <div className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm">
                    {day.weather.icon}
                    <span className="text-gray-600 font-medium">{day.weather.temp}</span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {day.details.map((detail, dIdx) => (
                      <div key={dIdx} className="pl-6 relative group">
                        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
                          detail.type === 'transport' ? 'bg-blue-400' :
                          detail.type === 'food' ? 'bg-orange-400' :
                          detail.type === 'hotel' ? 'bg-indigo-400' : 
                          detail.type === 'shop' ? 'bg-purple-400' : 'bg-green-400'
                        }`}></div>
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-gray-400 font-mono">{detail.time}</div>
                            <div className="text-sm text-gray-700 font-medium">{detail.event}</div>
                            {detail.note && (
                              <div className="text-xs text-indigo-600 mt-1 flex items-center bg-indigo-50 p-1 rounded w-fit">
                                <Bed className="w-3 h-3 mr-1" />
                                {detail.note}
                              </div>
                            )}
                          </div>
                          
                          {/* Navigation Button */}
                          {detail.nav && (
                            <button 
                              onClick={() => openMap(detail.nav)}
                              className="ml-2 p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="開啟導航"
                            >
                              <Navigation className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md mt-4">
              <h3 className="text-amber-800 font-bold flex items-center text-sm mb-2">
                <AlertTriangle className="w-4 h-4 mr-2" />
                航班提醒
              </h3>
              <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                <li>去程 IT240：06:45 起飛，10:00 抵達。</li>
                <li>回程 AK1511：16:55 起飛，請於 14:00 前到機場還車。</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB: 飯店 */}
        {activeTab === 'hotels' && (
          <div className="p-4 space-y-4 animate-in slide-in-from-right duration-300">
             <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4">
                <Bed className="w-5 h-5 mr-2 text-indigo-600" />
                住宿統整
             </h2>
             {hotels.map((hotel, idx) => (
               <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-4">
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{hotel.date}</span>
                     <span className="text-xs font-medium text-gray-400">{hotel.priceLevel}</span>
                   </div>
                   <h3 className="text-base font-bold text-gray-800 mb-1">{hotel.name}</h3>
                   <div className="flex items-center text-xs text-gray-500 mb-2">
                     <MapPin className="w-3 h-3 mr-1" /> {hotel.location}
                   </div>

                   {/* Check-in / Check-out Time Badge */}
                   <div className="flex items-center gap-3 text-xs bg-gray-50 p-2 rounded mb-3 border border-gray-100">
                     <div className="flex items-center text-gray-700">
                       <Clock className="w-3 h-3 mr-1 text-blue-500" />
                       Check-in: <span className="font-bold ml-1">{hotel.checkIn}</span>
                     </div>
                     <div className="w-px h-3 bg-gray-300"></div>
                     <div className="flex items-center text-gray-700">
                       <LogOut className="w-3 h-3 mr-1 text-orange-500" />
                       Check-out: <span className="font-bold ml-1">{hotel.checkOut}</span>
                     </div>
                   </div>

                   <p className="text-xs text-gray-600 mb-3">
                     {hotel.note}
                   </p>
                   <div className="flex gap-2">
                     <a href={hotel.link} target="_blank" rel="noopener noreferrer" 
                        className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Booking 訂單
                     </a>
                     <button 
                        onClick={() => openMap(hotel.name)}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Navigation className="w-3 h-3 mr-1" />
                        導航
                     </button>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {/* TAB: 分帳 */}
        {activeTab === 'expenses' && (
          <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
            
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-blue-200 text-xs uppercase tracking-wider">總支出</p>
                  <h2 className="text-3xl font-bold">¥{total.toLocaleString()}</h2>
                </div>
                <div className="text-right">
                  <p className="text-blue-200 text-xs uppercase tracking-wider">每人應付</p>
                  <h2 className="text-xl font-bold">¥{perPerson.toLocaleString()}</h2>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-blue-500/30">
                {balances.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-400/30 flex items-center justify-center text-xs">{m.name.charAt(0)}</div>
                      {m.name}
                    </span>
                    <span className={`font-mono font-medium ${m.balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {m.balance >= 0 ? `收 ¥${m.balance.toLocaleString()}` : `付 ¥${Math.abs(m.balance).toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2">
                新增公費支出 
                {user ? (
                  <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                    已連線同步
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">離線模式 (請檢查 Auth)</span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">誰付錢</label>
                  <select 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={newExpense.payer}
                    onChange={(e) => setNewExpense({...newExpense, payer: e.target.value})}
                  >
                    {members.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">金額 (円)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    placeholder="0"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="mb-3">
                 <label className="text-xs text-gray-500 block mb-1">項目說明</label>
                 <input 
                    type="text" 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    placeholder="例如：第一晚燒肉、租車費..."
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  />
              </div>
              <button 
                onClick={handleAddExpense}
                disabled={!user && !!db}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> {user ? '加入雲端清單' : '連線中...'}
              </button>
            </div>

            {/* List */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700 text-sm flex justify-between">
                <span>支出紀錄 ({expenses.length})</span>
                {loading && <span className="text-xs font-normal text-gray-400">同步中...</span>}
              </h3>
              
              {loading ? (
                <div className="text-center py-8 text-gray-400 text-sm">正在載入雲端帳本...</div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">尚未有任何支出，快來新增第一筆吧！</div>
              ) : (
                expenses.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold">
                        {item.payer.charAt(0)}
                      </div>
                      <div>
                        <div className="text-gray-800 font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-gray-400">{item.date} • 由 {item.payer} 支付</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-800">¥{Number(item.amount).toLocaleString()}</span>
                      <button onClick={() => handleDeleteExpense(item.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 p-2 pb-5 grid grid-cols-3 shadow-lg absolute bottom-0 w-full z-20">
        <button 
          onClick={() => setActiveTab('itinerary')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === 'itinerary' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
        >
          <Map className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">行程地圖</span>
        </button>
        <button 
          onClick={() => setActiveTab('hotels')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === 'hotels' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
        >
          <Bed className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">住宿統整</span>
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === 'expenses' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
        >
          <Calculator className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">公費分帳</span>
        </button>
      </div>
    </div>
  );
};

export default KyushuTripApp;

