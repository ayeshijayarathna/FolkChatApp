import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator,
  Dimensions, Animated,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { GROQ_API_KEY } from '../../config/keys';

const { width } = Dimensions.get('window');
const CHART_W = width - 64;
const GROQ_KEY = GROQ_API_KEY;

const C = {
  blue:   '#4A90E2',
  violet: '#7B61FF',
  rose:   '#E25C6A',
  teal:   '#1A9E8C',
  slate:  '#5E7A9E',
  gold:   '#C8A84B',
  green:  '#27AE60',
};

const ANGLES = [
  'content strategy', 'community building', 'visual storytelling',
  'Sri Lankan cultural heritage', 'collaboration tactics',
  'posting timing & schedule', 'caption writing techniques',
  'folk art techniques showcase',
];

// types
interface PostStat {
  id: string; title: string;
  likes: number; comments: number; bookmarks: number; views: number;
  createdAt: any;
}
interface Analytics {
  totalPosts: number; totalLikes: number; totalComments: number;
  totalBookmarks: number; totalViews: number;
  followers: number; following: number; topPosts: PostStat[];
}
type Period = '7d' | '30d' | '1y';

//helpers
function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function calcEngagement(a: Analytics) {
  const interactions = a.totalLikes + a.totalComments + a.totalBookmarks;
  const reach = a.totalViews > 0 ? a.totalViews : (a.followers > 0 ? a.followers * a.totalPosts : 1);
  const rate = reach > 0 ? Math.min((interactions / reach) * 100, 100) : 0;
  const formula = a.totalViews > 0
    ? `(Likes + Comments + Saves) ÷ Total Views × 100`
    : `(Likes + Comments + Saves) ÷ (Followers × Posts) × 100`;
  const label = rate > 6 ? 'Excellent' : rate > 3 ? 'Good' : rate > 1 ? 'Average' : 'Growing';
  const color = rate > 6 ? C.green : rate > 3 ? C.teal : rate > 1 ? C.blue : C.slate;
  return { rate, formula, label, color };
}

function buildChart(posts: PostStat[], period: Period) {
  const now = new Date();
  let buckets: number;
  let labelFn: (i: number) => string;
  let bucketFn: (d: Date) => number;

  if (period === '7d') {
    buckets = 7;
    labelFn = i => { const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return d.toLocaleDateString('en-US', { weekday: 'short' }); };
    bucketFn = (d: Date) => { const diff = Math.floor((now.getTime() - d.getTime()) / 86400000); return diff >= 0 && diff < 7 ? 6 - diff : -1; };
  } else if (period === '30d') {
    buckets = 6;
    labelFn = i => { const d = new Date(now); d.setDate(d.getDate() - (30 - i * 5)); return `${d.getDate()}/${d.getMonth() + 1}`; };
    bucketFn = (d: Date) => { const diff = Math.floor((now.getTime() - d.getTime()) / 86400000); if (diff < 0 || diff >= 30) return -1; return Math.floor((29 - diff) / 5); };
  } else {
    buckets = 12;
    labelFn = i => { const d = new Date(now); d.setMonth(d.getMonth() - (11 - i)); return d.toLocaleDateString('en-US', { month: 'short' }); };
    bucketFn = (d: Date) => { const dm = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()); return dm >= 0 && dm < 12 ? 11 - dm : -1; };
  }

  const likes = Array(buckets).fill(0);
  const views = Array(buckets).fill(0);
  posts.forEach(p => {
    if (!p.createdAt) return;
    const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    const idx = bucketFn(d);
    if (idx >= 0) { likes[idx] += p.likes; views[idx] += p.views; }
  });
  if (!likes.some(v => v > 0) && !views.some(v => v > 0) && posts.length > 0) {
    likes[buckets - 1] = posts.reduce((s, p) => s + p.likes, 0);
    views[buckets - 1] = posts.reduce((s, p) => s + p.views, 0);
  }
  return { likes, views, labels: Array.from({ length: buckets }, (_, i) => labelFn(i)) };
}

//line Chart 
function LineChart({ data, labels, color, colors, period }: {
  data: number[]; labels: string[]; color: string; colors: any; period: Period;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const max = Math.max(...data, 1);
  const allZero = data.every(v => v === 0);
  const SVG_H = 120;
  const PAD_TOP = 16, PAD_BOT = 4, PAD_L = 16, PAD_R = 16, POINT_GAP = 48;
  const svgW = Math.max(PAD_L + (data.length - 1) * POINT_GAP + PAD_R, CHART_W - 32);
  const getY = (v: number) => allZero ? SVG_H - PAD_BOT - 4 : PAD_TOP + ((max - v) / max) * (SVG_H - PAD_TOP - PAD_BOT);
  const pts = data.map((v, i) => ({ x: PAD_L + i * POINT_GAP, y: getY(v), v, label: labels[i] }));
  const yMax = allZero ? 0 : max;
  const yMid = Math.round(yMax / 2);

  return (
    <View>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height: SVG_H }]}>
          <Text style={[styles.yLbl, { color: colors.muted }]}>{fmtNum(yMax)}</Text>
          <Text style={[styles.yLbl, { color: colors.muted }]}>{fmtNum(yMid)}</Text>
          <Text style={[styles.yLbl, { color: colors.muted }]}>0</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ width: svgW }}>
            <View style={{ width: svgW, height: SVG_H, position: 'relative' }}>
              {[0, 0.5, 1].map((f, i) => (
                <View key={i} style={[styles.gridLine, {
                  top: PAD_TOP + f * (SVG_H - PAD_TOP - PAD_BOT),
                  backgroundColor: colors.border,
                }]} />
              ))}
              {pts.slice(0, -1).map((pt, i) => {
                const nx = pts[i + 1];
                const dx = nx.x - pt.x, dy = nx.y - pt.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const cx = (pt.x + nx.x) / 2, cy = (pt.y + nx.y) / 2;
                return (
                  <View key={i} style={{
                    position: 'absolute', left: cx - len / 2, top: cy - 1.25,
                    width: len, height: 2.5, borderRadius: 2,
                    backgroundColor: allZero ? colors.border : color,
                    opacity: allZero ? 0.3 : 0.9,
                    transform: [{ rotate: `${angle}deg` }],
                  }} />
                );
              })}
              {pts.map((pt, i) => {
                const isActive = activeIdx === i;
                return (
                  <TouchableOpacity key={i} onPress={() => setActiveIdx(isActive ? null : i)}
                    style={{ position: 'absolute', left: pt.x - 12, top: pt.y - 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
                    activeOpacity={0.7}>
                    {isActive && <View style={{ position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: color, opacity: 0.2 }} />}
                    <View style={{
                      width: isActive ? 12 : 8, height: isActive ? 12 : 8, borderRadius: 6,
                      backgroundColor: isActive ? color : colors.card,
                      borderWidth: 2, borderColor: allZero ? colors.border : color,
                    }} />
                    {isActive && (
                      <View style={[styles.chartTooltip, { backgroundColor: colors.darkText }]}>
                        <Text style={styles.tooltipDate}>{pt.label}</Text>
                        <Text style={[styles.tooltipVal, { color }]}>{fmtNum(pt.v)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 20, position: 'relative', width: svgW }}>
              {pts.map((pt, i) => (
                <Text key={i} style={[styles.xLabel, {
                  left: pt.x - POINT_GAP / 2, width: POINT_GAP,
                  color: activeIdx === i ? color : colors.muted,
                  fontWeight: activeIdx === i ? '700' : '400',
                }]}>{pt.label}</Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      {allZero && (
        <Text style={[styles.chartEmptyHint, { color: colors.muted }]}>
          No activity yet — interactions will appear here
        </Text>
      )}
    </View>
  );
}

//follower Chart
function FollowerChart({ followers, following, colors }: { followers: number; following: number; colors: any }) {
  const BAR_W = width - 64 - 40;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
  }, [followers, following]);
  const total = Math.max(followers + following, 1);
  const fWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W * (followers / total)] });
  const gWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W * (following / total)] });
  const ratio = followers > 0 && following > 0 ? (followers / following).toFixed(2) : '—';
  const health = followers > following ? 'Great — more people follow you than you follow!'
    : followers === following ? 'Balanced — equal followers and following.'
    : 'Tip — grow your followers to improve your ratio.';

  return (
    <View style={styles.followerWrap}>
      <View style={[styles.followerTrack, { backgroundColor: colors.warmBg }]}>
        <Animated.View style={[styles.followerBarF, { width: fWidth, backgroundColor: C.blue }]} />
        <Animated.View style={{ height: '100%', backgroundColor: C.violet, width: gWidth }} />
      </View>
      <View style={styles.followerLabels}>
        <View style={styles.followerLabelItem}>
          <View style={[styles.followerDot, { backgroundColor: C.blue }]} />
          <View>
            <Text style={[styles.followerVal, { color: colors.darkText }]}>{fmtNum(followers)}</Text>
            <Text style={[styles.followerSub, { color: colors.muted }]}>Followers</Text>
          </View>
        </View>
        <View style={styles.ratioBadge}>
          <Text style={[styles.ratioTxt, { color: colors.darkText }]}>{ratio}</Text>
          <Text style={[styles.ratioSub, { color: colors.muted }]}>ratio</Text>
        </View>
        <View style={[styles.followerLabelItem, { alignItems: 'flex-end' }]}>
          <View>
            <Text style={[styles.followerVal, { color: colors.darkText, textAlign: 'right' }]}>{fmtNum(following)}</Text>
            <Text style={[styles.followerSub, { color: colors.muted, textAlign: 'right' }]}>Following</Text>
          </View>
          <View style={[styles.followerDot, { backgroundColor: C.violet }]} />
        </View>
      </View>
      <View style={[styles.followerInsight, { backgroundColor: `${C.blue}10`, borderColor: `${C.blue}25` }]}>
        <Ionicons name="information-circle-outline" size={14} color={C.blue} />
        <Text style={[styles.followerInsightTxt, { color: colors.muted }]}>{health}</Text>
      </View>
    </View>
  );
}

//engagement Section
function EngagementSection({ a, colors }: { a: Analytics; colors: any }) {
  const { rate, formula, label, color } = calcEngagement(a);
  const interactions = a.totalLikes + a.totalComments + a.totalBookmarks;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: rate / 100, duration: 900, useNativeDriver: false }).start();
  }, [rate]);
  const ENG_BAR_W = width - 64 - 40;
  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, ENG_BAR_W * Math.min(rate / 100, 1)] });
  const BREAK_BAR_W = width - 64 - 40 - 64 - 50 - 48;
  const breakdown = [
    { label: 'Likes',    val: a.totalLikes,     pct: interactions > 0 ? Math.round(a.totalLikes / interactions * 100)     : 0, color: C.rose },
    { label: 'Comments', val: a.totalComments,   pct: interactions > 0 ? Math.round(a.totalComments / interactions * 100)  : 0, color: C.violet },
    { label: 'Saves',    val: a.totalBookmarks,  pct: interactions > 0 ? Math.round(a.totalBookmarks / interactions * 100) : 0, color: C.teal },
  ];

  return (
    <View style={styles.engWrap}>
      <View style={styles.engRateRow}>
        <View style={styles.engRateLeft}>
          <Text style={[styles.engRateBig, { color }]}>{rate.toFixed(2)}%</Text>
          <View style={[styles.engRateBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.engRateBadgeTxt, { color }]}>{label}</Text>
          </View>
        </View>
        <View style={styles.engBenchmarks}>
          <Text style={[styles.engBenchTitle, { color: colors.muted }]}>Industry benchmarks</Text>
          {[
            { lbl: 'Excellent', val: '> 6%', color: C.green },
            { lbl: 'Good',      val: '3–6%', color: C.teal },
            { lbl: 'Average',   val: '1–3%', color: C.blue },
            { lbl: 'Growing',   val: '< 1%', color: C.slate },
          ].map((b, i) => (
            <View key={i} style={styles.engBenchRow}>
              <View style={[styles.engBenchDot, { backgroundColor: b.color }]} />
              <Text style={[styles.engBenchTxt, { color: colors.muted }]}>{b.lbl}: {b.val}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.engBarTrack, { backgroundColor: colors.warmBg }]}>
        <Animated.View style={[styles.engBarFill, { width: barWidth, backgroundColor: color }]} />
      </View>
      <Text style={[styles.engFormula, { color: colors.muted }]}>Formula: {formula}</Text>
      <Text style={[styles.engBreakTitle, { color: colors.darkText }]}>Interaction breakdown</Text>
      {breakdown.map((b, i) => (
        <View key={i} style={styles.engBreakRow}>
          <View style={[styles.engBreakDot, { backgroundColor: b.color }]} />
          <Text style={[styles.engBreakLbl, { color: colors.muted }]}>{b.label}</Text>
          <View style={[styles.engBreakBarTrack, { backgroundColor: colors.warmBg }]}>
            <View style={[styles.engBreakBarFill, { width: Math.max(BREAK_BAR_W * b.pct / 100, b.pct > 0 ? 4 : 0), backgroundColor: b.color }]} />
          </View>
          <Text style={[styles.engBreakPct, { color: colors.darkText }]}>{b.pct}%</Text>
          <Text style={[styles.engBreakVal, { color: colors.muted }]}>({fmtNum(b.val)})</Text>
        </View>
      ))}
    </View>
  );
}

//period tabs
function PeriodTabs({ value, onChange, colors }: { value: Period; onChange: (p: Period) => void; colors: any }) {
  return (
    <View style={[styles.periodWrap, { backgroundColor: colors.offwhite, borderColor: colors.border }]}>
      {(['7d', '30d', '1y'] as Period[]).map(p => (
        <TouchableOpacity key={p}
          style={[styles.periodTab, value === p && { backgroundColor: colors.card, elevation: 2 }]}
          onPress={() => onChange(p)}>
          <Text style={[styles.periodTxt, { color: value === p ? colors.darkText : colors.muted }]}>
            {p === '7d' ? '7D' : p === '30d' ? '30D' : '1Y'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

//stat Card 
function StatCard({ icon, label, value, color, sub, colors }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statVal, { color: colors.darkText }]}>{fmtNum(value)}</Text>
      <Text style={[styles.statLbl, { color: colors.muted }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color }]}>{sub}</Text> : null}
    </View>
  );
}

//top post row
function TopPostRow({ post, rank, colors }: { post: PostStat; rank: number; colors: any }) {
  const medals: Record<number, string> = { 0: C.gold, 1: '#A8A8A8', 2: '#A0785A' };
  return (
    <View style={[styles.topRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.topBadge, { backgroundColor: medals[rank] || colors.warmBg }]}>
        <Text style={styles.topBadgeTxt}>{rank + 1}</Text>
      </View>
      <View style={styles.topInfo}>
        <Text style={[styles.topTitle, { color: colors.darkText }]} numberOfLines={1}>{post.title || 'Untitled'}</Text>
        <View style={styles.topStats}>
          {[
            { icon: 'heart',              color: C.rose,   val: post.likes },
            { icon: 'eye-outline',        color: C.blue,   val: post.views },
            { icon: 'chatbubble-outline', color: C.violet, val: post.comments },
            { icon: 'bookmark',           color: C.teal,   val: post.bookmarks },
          ].map((s, i) => (
            <View key={i} style={styles.topStat}>
              <Ionicons name={s.icon as any} size={11} color={s.color} />
              <Text style={[styles.topStatTxt, { color: colors.muted }]}>{fmtNum(s.val)}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.topTotal, { color: C.teal }]}>{fmtNum(post.likes + post.views + post.comments)}</Text>
    </View>
  );
}

//AI Tips 
function AITips({ analytics, colors }: { analytics: Analytics; colors: any }) {
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [angle, setAngle] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const { rate } = calcEngagement(analytics);

  const fetchTips = useCallback(async () => {
    setLoading(true); setGenerated(false);
    const chosenAngle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
    setAngle(chosenAngle);
    spinAnim.setValue(0);
    const loop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true }));
    loop.start();

    const prompt = `Timestamp: ${Date.now()}. Focus angle: "${chosenAngle}".
Sri Lankan folk artist on FolkChat — exact stats:
- Posts: ${analytics.totalPosts}, Followers: ${analytics.followers}, Following: ${analytics.following}
- Likes: ${analytics.totalLikes}, Views: ${analytics.totalViews}, Comments: ${analytics.totalComments}, Saves: ${analytics.totalBookmarks}
- Engagement Rate: ${rate.toFixed(2)}% (industry avg: 3–6%)
- Like-to-view ratio: ${analytics.totalViews > 0 ? ((analytics.totalLikes / analytics.totalViews) * 100).toFixed(1) : 'N/A'}%
Write 5 tips SPECIFICALLY about "${chosenAngle}" for this artist.
RULES: Each tip MUST include a specific number from their stats. No generic advice. Reference Sri Lankan folk art culture. 12–18 words per tip. Each tip starts with an action verb.
Return ONLY valid JSON array: ["tip1","tip2","tip3","tip4","tip5"]`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            { role: 'system', content: 'You are a creative social media strategist specializing in South Asian arts. Give highly specific, data-driven, unique tips. Never use generic phrases. Always reference exact numbers provided.' },
            { role: 'user', content: prompt },
          ],
          temperature: 1.3, max_tokens: 500,
        }),
      });
      const json = await res.json();
      const raw = json.choices?.[0]?.message?.content || '';
      const match = raw.match(/\[[\s\S]*?\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTips(parsed.slice(0, 5)); setIsAI(true);
          setGenerated(true); setLoading(false); loop.stop(); return;
        }
      }
      throw new Error('parse');
    } catch {
      setIsAI(false);
      setTips([
        `With ${analytics.totalPosts} posts, try posting 3x/week to accelerate reach.`,
        `Your ${analytics.totalLikes} likes show potential — add CTAs to double engagement.`,
        analytics.followers < 100 ? `Reach ${analytics.followers + 50} followers by collaborating with another folk artist.` : `Convert your ${analytics.followers} followers into community by asking weekly art questions.`,
        `Your ${analytics.totalViews} views suggest interest — create a series on your craft technique.`,
        `With ${analytics.totalBookmarks} saves, share printable folk art patterns to increase saves further.`,
      ]);
    }
    setGenerated(true); setLoading(false); loop.stop();
  }, [analytics]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (!generated && !loading) {
    return (
      <TouchableOpacity style={[styles.aiGenBtn, { backgroundColor: C.blue }]} onPress={fetchTips} activeOpacity={0.85}>
        <Ionicons name="sparkles-outline" size={20} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.aiGenBtnTitle}>Generate AI Tips</Text>
          <Text style={styles.aiGenBtnSub}>Personalized based on your exact stats</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.aiLoadWrap}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="sparkles-outline" size={24} color={C.blue} />
        </Animated.View>
        <View>
          <Text style={[styles.aiLoadTitle, { color: colors.darkText }]}>Analyzing your stats...</Text>
          <Text style={[styles.aiLoadSub, { color: colors.muted }]}>Focus: {angle}</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.aiBadge, { backgroundColor: isAI ? `${C.blue}12` : `${colors.muted}12` }]}>
        <Ionicons name={isAI ? 'sparkles' : 'information-circle-outline'} size={12} color={isAI ? C.blue : colors.muted} />
        <Text style={[styles.aiBadgeTxt, { color: isAI ? C.blue : colors.muted }]}>
          {isAI ? `Focus: ${angle}` : 'Based on your stats'}
        </Text>
      </View>
      {tips.map((tip, i) => (
        <View key={i} style={[styles.aiTipRow, { borderBottomColor: i < tips.length - 1 ? colors.border : 'transparent' }]}>
          <View style={[styles.aiTipNum, { backgroundColor: C.blue }]}>
            <Text style={styles.aiTipNumTxt}>{i + 1}</Text>
          </View>
          <Text style={[styles.aiTipTxt, { color: colors.muted }]}>{tip}</Text>
        </View>
      ))}
      <TouchableOpacity style={[styles.aiRegenBtn, { backgroundColor: `${C.blue}10`, borderColor: `${C.blue}35` }]} onPress={fetchTips} activeOpacity={0.8}>
        <Ionicons name="refresh-outline" size={15} color={C.blue} />
        <Text style={[styles.aiRegenTxt, { color: C.blue }]}>Generate New Tips</Text>
      </TouchableOpacity>
    </View>
  );
}

// main Screen 
export default function AnalyticsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();
  const { user, userProfile } = useAuthStore();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [allPosts, setAllPosts] = useState<PostStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('7d');
  const [chart, setChart] = useState<{ likes: number[]; views: number[]; labels: string[] } | null>(null);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [userDoc, postsSnap] = await Promise.all([
        firestore().collection('users').doc(user.uid).get(),
        firestore().collection('posts').where('userId', '==', user.uid).get(),
      ]);
      const ud = userDoc.data() || {};
      const posts: PostStat[] = postsSnap.docs.map(d => {
        const data = d.data();
        return { id: d.id, title: data.title || '', likes: data.likes?.length || 0, comments: data.commentCount || 0, bookmarks: data.bookmarks?.length || 0, views: data.viewCount || 0, createdAt: data.createdAt };
      });
      setAllPosts(posts);
      setChart(buildChart(posts, period));
      setAnalytics({
        totalPosts: posts.length,
        totalLikes: posts.reduce((s, p) => s + p.likes, 0),
        totalComments: posts.reduce((s, p) => s + p.comments, 0),
        totalBookmarks: posts.reduce((s, p) => s + p.bookmarks, 0),
        totalViews: posts.reduce((s, p) => s + p.views, 0),
        followers: ud.followers?.length || 0,
        following: ud.following?.length || 0,
        topPosts: [...posts].sort((a, b) => (b.likes + b.views + b.comments) - (a.likes + a.views + a.comments)).slice(0, 5),
      });
    } catch (e) { console.log('Analytics:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [user]);
  useEffect(() => { if (allPosts.length > 0) setChart(buildChart(allPosts, period)); }, [period, allPosts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>{t.analytics}</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); load(); }}>
          <Ionicons name="refresh-outline" size={22} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={[styles.loadTxt, { color: colors.muted }]}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.blue]} />}
          contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Profile banner */}
          <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bannerName, { color: colors.darkText }]}>{userProfile?.name || 'Artist'}</Text>
            <Text style={[styles.bannerCat, { color: colors.muted }]}>{userProfile?.artistCategory || 'Folk Artist'}</Text>
            <View style={styles.bannerRow}>
              {[
                { val: analytics?.totalPosts || 0, lbl: 'Posts',     color: C.teal },
                { val: analytics?.followers  || 0, lbl: 'Followers', color: C.blue },
                { val: analytics?.following  || 0, lbl: 'Following', color: C.violet },
              ].map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={[styles.bannerDiv, { backgroundColor: colors.border }]} />}
                  <View style={styles.bannerStat}>
                    <Text style={[styles.bannerVal, { color: item.color }]}>{fmtNum(item.val)}</Text>
                    <Text style={[styles.bannerLbl, { color: colors.muted }]}>{item.lbl}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Overview */}
          <Text style={[styles.secLabel, { color: colors.muted }]}>OVERVIEW</Text>
          <View style={styles.grid}>
            {[
              { icon: 'heart',              label: 'Total Likes',  value: analytics?.totalLikes    || 0, color: C.rose,   sub: analytics?.totalPosts ? `${((analytics.totalLikes || 0)  / analytics.totalPosts).toFixed(1)} avg/post` : undefined },
              { icon: 'eye-outline',        label: 'Total Views',  value: analytics?.totalViews    || 0, color: C.blue,   sub: analytics?.totalPosts ? `${((analytics.totalViews || 0)  / analytics.totalPosts).toFixed(0)} avg/post` : undefined },
              { icon: 'chatbubble-outline', label: 'Comments',     value: analytics?.totalComments || 0, color: C.violet, sub: undefined },
              { icon: 'bookmark',           label: 'Saves',        value: analytics?.totalBookmarks|| 0, color: C.teal,   sub: undefined },
            ].map((item, i) => <StatCard key={i} {...item} colors={colors} />)}
          </View>

          {/* Engagement */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.secHead}>
              <Ionicons name="pulse-outline" size={18} color={C.blue} />
              <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>Engagement Rate</Text>
            </View>
            {analytics && <EngagementSection a={analytics} colors={colors} />}
          </View>

          {/* Audience */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.secHead}>
              <Ionicons name="people-outline" size={18} color={C.blue} />
              <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>Audience</Text>
            </View>
            {analytics && <FollowerChart followers={analytics.followers} following={analytics.following} colors={colors} />}
          </View>

          {/* Activity chart */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.secHead, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trending-up-outline" size={18} color={C.blue} />
                <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>Activity</Text>
              </View>
              <PeriodTabs value={period} onChange={setPeriod} colors={colors} />
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: C.rose }]} /><Text style={[styles.legendTxt, { color: colors.muted }]}>Likes</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: C.blue }]} /><Text style={[styles.legendTxt, { color: colors.muted }]}>Views</Text></View>
            </View>
            {chart && (
              <>
                <Text style={[styles.chartSub, { color: C.rose }]}>Likes</Text>
                <LineChart data={chart.likes} labels={chart.labels} color={C.rose} colors={colors} period={period} />
                <View style={{ height: 18 }} />
                <Text style={[styles.chartSub, { color: C.blue }]}>Views</Text>
                <LineChart data={chart.views} labels={chart.labels} color={C.blue} colors={colors} period={period} />
              </>
            )}
          </View>

          {/* Top posts */}
          {(analytics?.topPosts || []).length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.secHead}>
                <Ionicons name="trophy-outline" size={18} color={C.gold} />
                <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>Top Posts</Text>
              </View>
              {analytics!.topPosts.map((post, i) => <TopPostRow key={post.id} post={post} rank={i} colors={colors} />)}
            </View>
          )}

          {/* AI Tips */}
          {analytics && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.secHead}>
                <Ionicons name="sparkles-outline" size={18} color={C.blue} />
                <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>AI Growth Tips</Text>
              </View>
              <AITips analytics={analytics} colors={colors} />
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  // Layout
  container:      { flex: 1 },
  loadWrap:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadTxt:        { fontSize: 14 },

  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 0.5 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold' },

  // Banner
  banner:         { margin: 16, borderRadius: 18, padding: 18, borderWidth: 0.5, gap: 4 },
  bannerName:     { fontSize: 18, fontWeight: '800' },
  bannerCat:      { fontSize: 13, marginBottom: 12 },
  bannerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerStat:     { alignItems: 'center', flex: 1 },
  bannerVal:      { fontSize: 20, fontWeight: '800' },
  bannerLbl:      { fontSize: 11, marginTop: 1 },
  bannerDiv:      { width: 1, height: 28 },

  // Section
  secLabel:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginHorizontal: 16, marginBottom: 10 },
  section:        { marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 0.5 },
  secHead:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  secHeadTxt:     { fontSize: 15, fontWeight: '700' },

  // Stats grid
  grid:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard:       { width: (width - 56) / 2, borderRadius: 16, padding: 16, gap: 4, borderWidth: 0.5 },
  statIcon:       { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statVal:        { fontSize: 26, fontWeight: '800' },
  statLbl:        { fontSize: 12 },
  statSub:        { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Chart
  chartRow:       { flexDirection: 'row' },
  yAxis:          { width: 28, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 },
  yLbl:           { fontSize: 8, fontWeight: '500' },
  gridLine:       { position: 'absolute', left: 0, right: 0, height: 0.5, opacity: 0.6 },
  chartTooltip:   { position: 'absolute', bottom: 22, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, alignItems: 'center', minWidth: 50, zIndex: 99, elevation: 6 },
  tooltipDate:    { color: 'rgba(255,255,255,0.65)', fontSize: 9 },
  tooltipVal:     { fontSize: 14, fontWeight: '800' },
  xLabel:         { position: 'absolute', textAlign: 'center', fontSize: 9 },
  chartEmptyHint: { fontSize: 11, textAlign: 'center', marginTop: 4, opacity: 0.7 },
  chartLegend:    { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine:     { width: 16, height: 2, borderRadius: 1 },
  legendTxt:      { fontSize: 12 },
  chartSub:       { fontSize: 11, fontWeight: '700', marginBottom: 6 },

  // Follower chart
  followerWrap:       { gap: 14 },
  followerTrack:      { height: 18, borderRadius: 9, flexDirection: 'row', overflow: 'hidden' },
  followerBarF:       { height: '100%', borderRadius: 9 },
  followerLabels:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  followerLabelItem:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  followerDot:        { width: 10, height: 10, borderRadius: 5 },
  followerVal:        { fontSize: 18, fontWeight: '800' },
  followerSub:        { fontSize: 11 },
  ratioBadge:         { alignItems: 'center' },
  ratioTxt:           { fontSize: 16, fontWeight: '800' },
  ratioSub:           { fontSize: 10 },
  followerInsight:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  followerInsightTxt: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Engagement
  engWrap:          { gap: 14 },
  engRateRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  engRateLeft:      { alignItems: 'flex-start', gap: 6 },
  engRateBig:       { fontSize: 42, fontWeight: '900', lineHeight: 46 },
  engRateBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  engRateBadgeTxt:  { fontSize: 12, fontWeight: '700' },
  engBenchmarks:    { flex: 1, gap: 4, paddingTop: 4 },
  engBenchTitle:    { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  engBenchRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  engBenchDot:      { width: 6, height: 6, borderRadius: 3 },
  engBenchTxt:      { fontSize: 11 },
  engBarTrack:      { height: 8, borderRadius: 4, overflow: 'hidden' },
  engBarFill:       { height: '100%', borderRadius: 4 },
  engFormula:       { fontSize: 11, lineHeight: 16 },
  engBreakTitle:    { fontSize: 13, fontWeight: '700' },
  engBreakRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  engBreakDot:      { width: 8, height: 8, borderRadius: 4 },
  engBreakLbl:      { fontSize: 12, width: 64 },
  engBreakBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  engBreakBarFill:  { height: '100%', borderRadius: 3 },
  engBreakPct:      { fontSize: 12, fontWeight: '700', width: 32, textAlign: 'right' },
  engBreakVal:      { fontSize: 11 },

  // Period tabs
  periodWrap: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2, alignSelf: 'flex-start', borderWidth: 0.5 },
  periodTab:  { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  periodTxt:  { fontSize: 13, fontWeight: '700' },

  // Top posts
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  topBadge:    { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  topBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  topInfo:     { flex: 1 },
  topTitle:    { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  topStats:    { flexDirection: 'row', gap: 10 },
  topStat:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  topStatTxt:  { fontSize: 11 },
  topTotal:    { fontSize: 13, fontWeight: '700' },

  // AI Tips
  aiGenBtn:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14 },
  aiGenBtnTitle:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  aiGenBtnSub:    { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  aiLoadWrap:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20 },
  aiLoadTitle:    { fontSize: 14, fontWeight: '600' },
  aiLoadSub:      { fontSize: 12, marginTop: 2 },
  aiBadge:        { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  aiBadgeTxt:     { fontSize: 11, fontWeight: '700' },
  aiTipRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  aiTipNum:       { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  aiTipNumTxt:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  aiTipTxt:       { flex: 1, fontSize: 13, lineHeight: 20 },
  aiRegenBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1 },
  aiRegenTxt:     { fontSize: 13, fontWeight: '600' },
});