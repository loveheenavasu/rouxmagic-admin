export interface Deal {
    id: string;
    created_at: string;
    title: string;
    description: string;
    order: number;
    subtitle: string;
    currency: string;
    credit_amount: number;
    cta_text: string;
    cta_link: string;
    image: string;
    is_active: boolean;
    price: number;
    redirect_button_inner_text?: string;
}
