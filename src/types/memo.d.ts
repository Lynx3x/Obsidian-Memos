// 添加 Dataview API 相关的类型定义
export interface DataviewListItem {
    header: {
        subpath: string;
    };
    children: any[];
    text: string;
    task?: boolean;
    status?: string;
    line: number;
    blockId?: string;
    path: string;
    parent?: any;
}

export interface BaseMemo {
    id: string;
    content: string;
    user_id?: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    memoType: string;
    hasId: string;
    linkId: string;
    path?: string;
}

export interface CreateCommentMemoParams {
    text: string;
    isList?: boolean;
    ID?: string;
    hasID?: string;
    content?: string;
    createdAt?: string;
    updatedAt?: string;
    memoType?: string;
    hasId?: string;
    linkId?: string;
    path?: string;
    user_id?: number;
}

export interface UpdateMemoParams {
    memoId?: string;
    originalText?: string;
    text?: string;
    type?: string;
    content?: string;
    updatedAt?: string;
    memoType?: string;
    hasId?: string;
    linkId?: string;
    path?: string;
    user_id?: number;
}

declare global {
    namespace Model {
        interface Memo extends BaseMemo { }
    }
}
