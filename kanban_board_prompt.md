# Kanban Board アプリケーション - 実装プロンプト

## 📋 概要

**目的**: フロントエンドの基本知識を一気通貫で習得するための学習用アプリケーション。バックエンド開発経験者が、フロントエンドのアーキテクチャ・設計・状態管理を実践的に学べる。

**学習スタイル**: まず全機能を実装してから、各パーツを pick up して復習するアプローチ。

---

## 🎯 アプリケーション要件

### 1. 機能要件（V1: 全一気通貫版）

#### 1.1 基本構造
- **3つの列（Column）**を表示: `TODO`, `IN PROGRESS`, `DONE`
- 各列に複数の **カード（Card）** を表示
- カードは列間を移動可能（ドラッグ&ドロップ対応）

#### 1.2 カード操作
- **カード追加**: 各列の下部に「+追加」ボタン → モーダルで入力 → 列に追加
- **カード削除**: カードのX ボタンで削除（確認ダイアログ推奨）
- **カード編集**: カード内容をクリックして編集モード → 保存
- **優先度フラグ**: カード上に優先度表示（Low/Medium/High） → 視認性向上

#### 1.3 ドラッグ&ドロップ
- 同列内でカード順序を変更可能
- 別の列へカードをドラッグして移動可能
- マウスオーバー時、ドロップ可能エリアをハイライト
- ドラッグ中はカードに半透明効果

#### 1.4 フィルタ・検索
- **検索ボックス**: タイトル・説明文で検索
- **優先度フィルタ**: チェックボックスで優先度を絞り込み（複数選択可）
- **リセットボタン**: フィルタをクリア

#### 1.5 統計表示
- **ボード全体**: 総カード数、完了カード数、完了率（%）
- **列ごと**: 各列のカード数
- リアルタイム更新

#### 1.6 永続化
- ボード状態を `localStorage` に保存
- ページリロード時に復元

---

### 2. 技術要件

#### 2.1 スタック
- **フレームワーク**: React 18 + TypeScript
- **状態管理**: Zustand（シンプルで学習向け）
- **ドラッグ&ドロップ**: `react-beautiful-dnd` または `dnd-kit`（後者が modern）
- **UI ライブラリ**: なし（CSS-in-JS または Tailwind CSS で自作）
- **テスト**: Vitest + React Testing Library（後で pick up 可能）

#### 2.2 ファイル構成（Feature-based）
```
src/
├── features/
│   ├── board/
│   │   ├── components/
│   │   │   ├── Board.tsx          # メインコンポーネント
│   │   │   ├── Column.tsx         # 列コンポーネント
│   │   │   ├── Card.tsx           # カードコンポーネント
│   │   │   ├── CardForm.tsx       # カード追加/編集フォーム
│   │   │   └── Statistics.tsx     # 統計表示
│   │   ├── hooks/
│   │   │   ├── useBoard.ts        # Zustand ストア
│   │   │   └── useFilter.ts       # フィルタロジック
│   │   ├── types/
│   │   │   └── board.ts           # Card, Column, Board 型定義
│   │   └── utils/
│   │       ├── localStorage.ts    # 保存/復元ロジック
│   │       └── validation.ts      # データバリデーション
├── App.tsx
└── index.tsx
```

#### 2.3 型定義（TypeScript）
```typescript
// types/board.ts

export type Priority = 'low' | 'medium' | 'high';

export type Card = {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;              // 列内での並び順
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
};

export type Column = {
  id: string;
  title: string;
};

export type Board = {
  columns: Column[];
  cards: Card[];              // 全カードをフラット管理
  filters: {
    search: string;
    priorities: Priority[];
  };
};
```

#### 2.4 状態管理設計（Zustand）
```typescript
// hooks/useBoard.ts

interface BoardStore {
  // 状態
  board: Board;
  
  // アクション
  addCard: (columnId: string, title: string, description: string, priority: Priority) => void;
  deleteCard: (cardId: string) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  moveCard: (cardId: string, targetColumnId: string, targetOrder: number) => void;
  setSearchFilter: (search: string) => void;
  setPriorityFilter: (priorities: Priority[]) => void;
  resetFilters: () => void;
  
  // 派生状態（selector として）
  getFilteredCards: () => Card[];
  getColumnsWithCards: () => (Column & { cards: Card[] })[];
  getStatistics: () => { total: number; completed: number; completionRate: number };
}
```

---

### 3. デザイン要件

#### 3.1 ビジュアル
- **色**: 落ち着いた配色（Gray, Blue, Amber）
- **レイアウト**: 3列レイアウト（flex で均等分割）
- **カード**: 白背景、 shadow で浮かせ、 border で優先度表示（左側カラーライン）
- **優先度色**: 
  - Low: Gray
  - Medium: Amber
  - High: Red

#### 3.2 UX
- ホバー時にマウスカーソルが `pointer` に変わる
- ボタンは hover で背景色変更
- フォーム送信は Enter キー対応
- 削除時は確認ダイアログ（window.confirm または自作モーダル）

#### 3.3 レスポンシブ
- デスクトップ優先（3列表示）
- タブレット以下は 1列 + スクロール（v2 で対応可）

---

### 4. 実装の進め方

#### **Phase 1: 基本形（静的）**
- [ ] プロジェクト初期化（Vite + React + TypeScript）
- [ ] 型定義を作成
- [ ] モックデータを用意
- [ ] Board/Column/Card コンポーネントを静的に作成
- [ ] CSS でレイアウト完成

**目標**: 画面に3列のカードが表示される

#### **Phase 2: 状態管理**
- [ ] Zustand ストア作成
- [ ] addCard, deleteCard, updateCard を実装
- [ ] localStorage 保存機能を実装
- [ ] コンポーネントに状態を接続

**目標**: カード追加・削除が動く、ページリロードで復元される

#### **Phase 3: ドラッグ&ドロップ**
- [ ] ドラッグ&ドロップライブラリをセットアップ
- [ ] Card を draggable に
- [ ] Column を droppable に
- [ ] moveCard ロジック実装

**目標**: カードをドラッグして列移動できる

#### **Phase 4: フィルタ・検索**
- [ ] 検索ボックス UI 作成
- [ ] 優先度フィルタ UI 作成（チェックボックス）
- [ ] getFilteredCards selector 実装
- [ ] コンポーネントに接続

**目標**: 検索・フィルタが動く

#### **Phase 5: 統計表示**
- [ ] Statistics コンポーネント作成
- [ ] getStatistics selector 実装
- [ ] 列別、ボード全体の統計を表示

**目標**: 統計がリアルタイム更新される

---

## 📌 学習ポイント（Pick up 対象）

実装後、以下を深掘り復習:

1. **状態設計の思想**
   - なぜカードを Column の children ではなく フラットで管理するのか
   - 派生状態（getColumnsWithCards）の効率性

2. **ドラッグ&ドロップの複雑さ**
   - 状態同期の難しさ
   - order フィールドの重要性

3. **派生状態の効率化**
   - getFilteredCards は毎回全カード走査 → useMemo で最適化
   - getStatistics の計算コスト

4. **テスト戦略**
   - ユニットテスト: Card 追加・削除・移動
   - 統合テスト: フィルタ適用時の全体挙動

5. **パフォーマンス最適化**
   - コンポーネント分割による再レンダ最小化
   - React.memo 活用

---

## ⚠️ 制約条件

- **バックエンド連携なし**: すべてクライアント側で完結。API 呼び出しは実装しない
- **ルーティングなし**: 単一ページアプリケーション
- **複雑なアニメーション不要**: UI フレームワークに頼らず、シンプルな CSS Transitions でOK

---

## 🚀 成功基準

以下が全て動く状態で「完成」:

- ✅ カード追加・削除・編集が動く
- ✅ ドラッグ&ドロップでカードを列間移動できる
- ✅ 検索・フィルタが機能する
- ✅ 統計がリアルタイム表示される
- ✅ ページリロードで状態が復元される
- ✅ TypeScript で型安全性がある
- ✅ コンポーネント設計が「単一責任」を満たしている

---

## 💡 実装時の推奨アプローチ

1. **型定義から始める**: 状態の shape を確定させておく
2. **モックコンポーネント**: 状態接続前に見た目を完成させる
3. **状態管理を分離**: UI と ビジネスロジックを明確に分ける
4. **ドラッグ&ドロップは最後**: 基本機能が動いてから追加
5. **localStorage は最後**: 機能検証後に永続化を実装

---

## 📚 参考: 追加学習トピック（v2, v3 以降）

- **URL 状態同期**: フィルタを URL query に反映
- **Undo/Redo**: アクション履歴管理
- **アニメーション**: Framer Motion で transition を追加
- **仮想スクロール**: カード数が 1000+ になった時の最適化
- **チームコラボレーション**: WebSocket でリアルタイム同期（バックエンド連携）
