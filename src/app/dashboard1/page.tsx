import CareerDashboardPage from '../(app)/career/page';

export const metadata = {
    title: 'Career & Applications Hub | CONDSTORE OS',
    description: 'Painel público de carreira e candidaturas de Rafael Barros.',
};

export default function PublicCareerDashboardPage() {
    return <CareerDashboardPage isPublic />;
}
