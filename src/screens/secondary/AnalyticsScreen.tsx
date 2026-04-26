import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator,
  Dimensions, Animated, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
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

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function initials(name: string) { return (name || 'A').charAt(0).toUpperCase(); }

function calcEngagement(a: Analytics, t: any) {
  const interactions = a.totalLikes + a.totalComments + a.totalBookmarks;
  const reach = a.totalViews > 0 ? a.totalViews : (a.followers > 0 ? a.followers * a.totalPosts : 1);
  const rate = reach > 0 ? Math.min((interactions / reach) * 100, 100) : 0;
  const formula = a.totalViews > 0
    ? `(Likes + Comments + Saves) ÷ Total Views × 100`
    : `(Likes + Comments + Saves) ÷ (Followers × Posts) × 100`;
  const label = rate > 6 ? t.excellent : rate > 3 ? t.good : rate > 1 ? t.average : t.growing;
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

// line Chart
function LineChart({ data, labels, color, colors, t }: {
  data: number[]; labels: string[]; color: string; colors: any; t: any;
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
        <Text style={[styles.chartEmptyHint, { color: colors.muted }]}>{t.noActivityHint}</Text>
      )}
    </View>
  );
}

// follower Chart
function FollowerChart({ followers, following, colors, t }: { followers: number; following: number; colors: any; t: any }) {
  const BAR_W = width - 64 - 40;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
  }, [followers, following]);
  const total = Math.max(followers + following, 1);
  const fWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W * (followers / total)] });
  const gWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W * (following / total)] });
  const ratio = followers > 0 && following > 0 ? (followers / following).toFixed(2) : '—';
  const health = followers > following ? t.audienceHealthMore
    : followers === following ? t.audienceHealthEqual
    : t.audienceHealthLess;

  return (
    <View style={styles.followerWrap}>
      <View style={[styles.followerTrack, { backgroundColor: `${colors.muted}15` }]}>
        <Animated.View style={[styles.followerBarF, { width: fWidth, backgroundColor: C.blue }]} />
        <Animated.View style={{ height: '100%', backgroundColor: C.violet, width: gWidth }} />
      </View>
      <View style={styles.followerLabels}>
        <View style={styles.followerLabelItem}>
          <View style={[styles.followerDot, { backgroundColor: C.blue }]} />
          <View>
            <Text style={[styles.followerVal, { color: colors.darkText }]}>{fmtNum(followers)}</Text>
            <Text style={[styles.followerSub, { color: colors.muted }]}>{t.followers}</Text>
          </View>
        </View>
        <View style={styles.ratioBadge}>
          <Text style={[styles.ratioTxt, { color: colors.darkText }]}>{ratio}</Text>
          <Text style={[styles.ratioSub, { color: colors.muted }]}>{t.ratio}</Text>
        </View>
        <View style={[styles.followerLabelItem, { alignItems: 'flex-end' }]}>
          <View>
            <Text style={[styles.followerVal, { color: colors.darkText, textAlign: 'right' }]}>{fmtNum(following)}</Text>
            <Text style={[styles.followerSub, { color: colors.muted, textAlign: 'right' }]}>{t.following}</Text>
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

// engagement Section
function EngagementSection({ a, colors, t }: { a: Analytics; colors: any; t: any }) {
  const { rate, formula, label, color } = calcEngagement(a, t);
  const interactions = a.totalLikes + a.totalComments + a.totalBookmarks;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: rate / 100, duration: 900, useNativeDriver: false }).start();
  }, [rate]);
  const ENG_BAR_W = width - 64 - 40;
  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, ENG_BAR_W * Math.min(rate / 100, 1)] });
  const BREAK_BAR_W = width - 64 - 40 - 64 - 50 - 48;
  const breakdown = [
    { label: t.likesLabel,    val: a.totalLikes,     pct: interactions > 0 ? Math.round(a.totalLikes / interactions * 100)     : 0, color: C.rose },
    { label: t.commentsLabel, val: a.totalComments,  pct: interactions > 0 ? Math.round(a.totalComments / interactions * 100)  : 0, color: C.violet },
    { label: t.savesLabel,    val: a.totalBookmarks, pct: interactions > 0 ? Math.round(a.totalBookmarks / interactions * 100) : 0, color: C.teal },
  ];

  return (
    <View style={styles.engWrap}>
      <View style={styles.engRateRow}>
        <View style={styles.engRateLeft}>
          <Text style={[styles.engRateBig, { color }]}>{rate.toFixed(2)}%</Text>
          <View style={[styles.engRateBadge, { backgroundColor: `${color}20` }]}>
            <Text style={[styles.engRateBadgeTxt, { color }]}>{label}</Text>
          </View>
        </View>
        <View style={styles.engBenchmarks}>
          <Text style={[styles.engBenchTitle, { color: colors.muted }]}>{t.industryBenchmarks}</Text>
          {[
            { lbl: t.excellent, val: '> 6%', color: C.green },
            { lbl: t.good,      val: '3–6%', color: C.teal },
            { lbl: t.average,   val: '1–3%', color: C.blue },
            { lbl: t.growing,   val: '< 1%', color: C.slate },
          ].map((b, i) => (
            <View key={i} style={styles.engBenchRow}>
              <View style={[styles.engBenchDot, { backgroundColor: b.color }]} />
              <Text style={[styles.engBenchTxt, { color: colors.muted }]}>{b.lbl}: {b.val}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.engBarTrack, { backgroundColor: `${colors.muted}15` }]}>
        <Animated.View style={[styles.engBarFill, { width: barWidth, backgroundColor: color }]} />
      </View>
      <Text style={[styles.engFormula, { color: colors.muted }]}>{t.formula}: {formula}</Text>
      <Text style={[styles.engBreakTitle, { color: colors.darkText }]}>{t.interactionBreakdown}</Text>
      {breakdown.map((b, i) => (
        <View key={i} style={styles.engBreakRow}>
          <View style={[styles.engBreakDot, { backgroundColor: b.color }]} />
          <Text style={[styles.engBreakLbl, { color: colors.muted }]}>{b.label}</Text>
          <View style={[styles.engBreakBarTrack, { backgroundColor: `${colors.muted}15` }]}>
            <View style={[styles.engBreakBarFill, { width: Math.max(BREAK_BAR_W * b.pct / 100, b.pct > 0 ? 4 : 0), backgroundColor: b.color }]} />
          </View>
          <Text style={[styles.engBreakPct, { color: colors.darkText }]}>{b.pct}%</Text>
          <Text style={[styles.engBreakVal, { color: colors.muted }]}>({fmtNum(b.val)})</Text>
        </View>
      ))}
    </View>
  );
}

// period tabs
function PeriodTabs({ value, onChange, colors }: { value: Period; onChange: (p: Period) => void; colors: any }) {
  return (
    <View style={[styles.periodWrap, { backgroundColor: `${colors.muted}10`, borderColor: `${colors.muted}20` }]}>
      {(['7d', '30d', '1y'] as Period[]).map(p => (
        <TouchableOpacity key={p}
          style={[styles.periodTab, value === p && { backgroundColor: colors.saffron }]}
          onPress={() => onChange(p)}>
          <Text style={[styles.periodTxt, { color: value === p ? '#fff' : colors.muted }]}>
            {p === '7d' ? '7D' : p === '30d' ? '30D' : '1Y'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// stat card
function StatCard({ icon, label, value, color, sub }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: `${color}10`, borderColor: `${color}30` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}25` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statVal, { color }]}>{fmtNum(value)}</Text>
      <Text style={[styles.statLbl, { color }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color, opacity: 0.75 }]}>{sub}</Text> : null}
    </View>
  );
}

// top post row
function TopPostRow({ post, rank, colors, t }: { post: PostStat; rank: number; colors: any; t: any }) {
  const medals: Record<number, string> = { 0: C.gold, 1: '#A8A8A8', 2: '#A0785A' };
  return (
    <View style={[styles.topRow, { borderBottomColor: `${colors.muted}20` }]}>
      <View style={[styles.topBadge, { backgroundColor: medals[rank] || `${colors.muted}30` }]}>
        <Text style={styles.topBadgeTxt}>{rank + 1}</Text>
      </View>
      <View style={styles.topInfo}>
        <Text style={[styles.topTitle, { color: colors.darkText }]} numberOfLines={1}>{post.title || t.untitled}</Text>
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

// AI Tips
function AITips({ analytics, colors, t }: { analytics: Analytics; colors: any; t: any }) {
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [angle, setAngle] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const { rate } = calcEngagement(analytics, t);

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
  }, [analytics, t]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (!generated && !loading) {
    return (
      <TouchableOpacity style={[styles.aiGenBtn, { backgroundColor: C.blue }]} onPress={fetchTips} activeOpacity={0.85}>
        <Ionicons name="sparkles-outline" size={20} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.aiGenBtnTitle}>{t.generateAITips}</Text>
          <Text style={styles.aiGenBtnSub}>{t.aiTipsSub}</Text>
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
          <Text style={[styles.aiLoadTitle, { color: colors.darkText }]}>{t.analyzingStats}</Text>
          <Text style={[styles.aiLoadSub, { color: colors.muted }]}>{t.focus}: {angle}</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.aiBadge, { backgroundColor: isAI ? `${C.blue}15` : `${colors.muted}15` }]}>
        <Ionicons name={isAI ? 'sparkles' : 'information-circle-outline'} size={12} color={isAI ? C.blue : colors.muted} />
        <Text style={[styles.aiBadgeTxt, { color: isAI ? C.blue : colors.muted }]}>
          {isAI ? `${t.focus}: ${angle}` : t.basedOnStats}
        </Text>
      </View>
      {tips.map((tip, i) => (
        <View key={i} style={[styles.aiTipRow, { borderBottomColor: i < tips.length - 1 ? `${colors.muted}20` : 'transparent' }]}>
          <View style={[styles.aiTipNum, { backgroundColor: C.blue }]}>
            <Text style={styles.aiTipNumTxt}>{i + 1}</Text>
          </View>
          <Text style={[styles.aiTipTxt, { color: colors.muted }]}>{tip}</Text>
        </View>
      ))}
      <TouchableOpacity style={[styles.aiRegenBtn, { backgroundColor: `${C.blue}15`, borderColor: `${C.blue}40` }]} onPress={fetchTips} activeOpacity={0.8}>
        <Ionicons name="refresh-outline" size={15} color={C.blue} />
        <Text style={[styles.aiRegenTxt, { color: C.blue }]}>{t.generateNewTips}</Text>
      </TouchableOpacity>
    </View>
  );
}

// main screen
export default function AnalyticsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { user, userProfile } = useAuthStore();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [allPosts, setAllPosts] = useState<PostStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('7d');
  const [chart, setChart] = useState<{ likes: number[]; views: number[]; labels: string[] } | null>(null);

  const gradientColors: string[] = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

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

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (allPosts.length > 0) setChart(buildChart(allPosts, period)); }, [period, allPosts]);

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: `${colors.muted}20` }]}>
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
          <ActivityIndicator size="large" color={colors.saffron} />
          <Text style={[styles.loadTxt, { color: colors.muted }]}>{t.loadingAnalytics}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: 'transparent' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.saffron]} />}
          contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Hero Profile Banner */}
          <View style={[styles.hero, { backgroundColor: colors.saffron }]}>
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                {userProfile?.avatarUrl ? (
                  <Image source={{ uri: userProfile.avatarUrl }} style={styles.heroAvatar} />
                ) : (
                  <View style={styles.heroAvatarInit}>
                    <Text style={styles.heroAvatarInitTxt}>{initials(userProfile?.name || '')}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroName} numberOfLines={1}>{userProfile?.name || t.folkArtist}</Text>
                  <View style={styles.heroCatRow}>
                    <Ionicons name="color-palette-outline" size={12} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.heroCat} numberOfLines={1}>{userProfile?.artistCategory || t.folkArtist}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.heroStats}>
                {[
                  { val: analytics?.totalPosts || 0, lbl: t.posts },
                  { val: analytics?.followers  || 0, lbl: t.followers },
                  { val: analytics?.following  || 0, lbl: t.following },
                ].map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.heroDiv} />}
                    <View style={styles.heroStat}>
                      <Text style={styles.heroVal}>{fmtNum(item.val)}</Text>
                      <Text style={styles.heroLbl}>{item.lbl}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          {/* Overview */}
          <Text style={[styles.secLabel, { color: colors.muted }]}>{t.overview}</Text>
          <View style={styles.grid}>
            {[
              { icon: 'heart',              label: t.totalLikes, value: analytics?.totalLikes    || 0, color: C.rose,   sub: analytics?.totalPosts ? `${((analytics.totalLikes || 0)  / analytics.totalPosts).toFixed(1)} ${t.avgPerPost}` : undefined },
              { icon: 'eye-outline',        label: t.totalViews, value: analytics?.totalViews    || 0, color: C.blue,   sub: analytics?.totalPosts ? `${((analytics.totalViews || 0)  / analytics.totalPosts).toFixed(0)} ${t.avgPerPost}` : undefined },
              { icon: 'chatbubble-outline', label: t.comments,   value: analytics?.totalComments || 0, color: C.violet, sub: undefined },
              { icon: 'bookmark',           label: t.saves,      value: analytics?.totalBookmarks|| 0, color: C.teal,   sub: undefined },
            ].map((item, i) => <StatCard key={i} {...item} />)}
          </View>

          {/* Engagement */}
          <View style={[styles.section, { backgroundColor: `${C.blue}08`, borderColor: `${C.blue}25` }]}>
            <View style={styles.secHead}>
              <View style={[styles.secHeadIcon, { backgroundColor: `${C.blue}20` }]}>
                <Ionicons name="pulse-outline" size={18} color={C.blue} />
              </View>
              <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>{t.engagementRate}</Text>
            </View>
            {analytics && <EngagementSection a={analytics} colors={colors} t={t} />}
          </View>

          {/* Audience */}
          <View style={[styles.section, { backgroundColor: `${C.violet}08`, borderColor: `${C.violet}25` }]}>
            <View style={styles.secHead}>
              <View style={[styles.secHeadIcon, { backgroundColor: `${C.violet}20` }]}>
                <Ionicons name="people-outline" size={18} color={C.violet} />
              </View>
              <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>{t.audience}</Text>
            </View>
            {analytics && <FollowerChart followers={analytics.followers} following={analytics.following} colors={colors} t={t} />}
          </View>

          {/* Activity */}
          <View style={[styles.section, { backgroundColor: `${C.teal}08`, borderColor: `${C.teal}25` }]}>
            <View style={[styles.secHead, { justifyContent: 'space-between', marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.secHeadIcon, { backgroundColor: `${C.teal}20` }]}>
                  <Ionicons name="trending-up-outline" size={18} color={C.teal} />
                </View>
                <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>{t.activity}</Text>
              </View>
              <PeriodTabs value={period} onChange={setPeriod} colors={colors} />
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: C.rose }]} /><Text style={[styles.legendTxt, { color: colors.muted }]}>{t.likesLabel}</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: C.blue }]} /><Text style={[styles.legendTxt, { color: colors.muted }]}>{t.viewsLabel}</Text></View>
            </View>
            {chart && (
              <>
                <Text style={[styles.chartSub, { color: C.rose }]}>{t.likesLabel}</Text>
                <LineChart data={chart.likes} labels={chart.labels} color={C.rose} colors={colors} t={t} />
                <View style={{ height: 18 }} />
                <Text style={[styles.chartSub, { color: C.blue }]}>{t.viewsLabel}</Text>
                <LineChart data={chart.views} labels={chart.labels} color={C.blue} colors={colors} t={t} />
              </>
            )}
          </View>

          {/* Top posts */}
          {(analytics?.topPosts || []).length > 0 && (
            <View style={[styles.section, { backgroundColor: `${C.gold}10`, borderColor: `${C.gold}30` }]}>
              <View style={styles.secHead}>
                <View style={[styles.secHeadIcon, { backgroundColor: `${C.gold}25` }]}>
                  <Ionicons name="trophy-outline" size={18} color={C.gold} />
                </View>
                <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>{t.topPosts}</Text>
              </View>
              {analytics!.topPosts.map((post, i) => <TopPostRow key={post.id} post={post} rank={i} colors={colors} t={t} />)}
            </View>
          )}

          {/* AI Tips */}
          {analytics && (
            <View style={[styles.section, { backgroundColor: `${C.blue}08`, borderColor: `${C.blue}25` }]}>
              <View style={styles.secHead}>
                <View style={[styles.secHeadIcon, { backgroundColor: `${C.blue}20` }]}>
                  <Ionicons name="sparkles-outline" size={18} color={C.blue} />
                </View>
                <Text style={[styles.secHeadTxt, { color: colors.darkText }]}>{t.aiGrowthTips}</Text>
              </View>
              <AITips analytics={analytics} colors={colors} t={t} />
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  loadWrap:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadTxt:        { fontSize: 14 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 0.5 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold' },
  hero:               { margin: 16, borderRadius: 24, padding: 20, overflow: 'hidden', position: 'relative', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  heroDecor1:         { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroDecor2:         { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroContent:        { gap: 16 },
  heroTop:            { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroAvatar:         { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  heroAvatarInit:     { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  heroAvatarInitTxt:  { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroName:           { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroCatRow:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  heroCat:            { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
  heroStats:          { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 14 },
  heroStat:           { alignItems: 'center', flex: 1 },
  heroVal:            { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroLbl:            { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroDiv:            { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  secLabel:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginHorizontal: 16, marginBottom: 10 },
  section:        { marginHorizontal: 16, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1 },
  secHead:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  secHeadIcon:    { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  secHeadTxt:     { fontSize: 15, fontWeight: '700' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard:       { width: (width - 56) / 2, borderRadius: 18, padding: 16, gap: 4, borderWidth: 1 },
  statIcon:       { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statVal:        { fontSize: 26, fontWeight: '800' },
  statLbl:        { fontSize: 12, fontWeight: '600' },
  statSub:        { fontSize: 10, fontWeight: '600', marginTop: 2 },
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
  periodWrap: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2, alignSelf: 'flex-start', borderWidth: 0.5 },
  periodTab:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  periodTxt:  { fontSize: 12, fontWeight: '700' },
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  topBadge:    { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  topBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  topInfo:     { flex: 1 },
  topTitle:    { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  topStats:    { flexDirection: 'row', gap: 10 },
  topStat:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  topStatTxt:  { fontSize: 11 },
  topTotal:    { fontSize: 13, fontWeight: '700' },
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