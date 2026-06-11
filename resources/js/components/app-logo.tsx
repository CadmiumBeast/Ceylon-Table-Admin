import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="bg-white text-sidebar-primary-foreground flex aspect-square size-9 items-center justify-center rounded-md">
                <AppLogoIcon className="size-9 fill-current text-white dark:text-black" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">Ceylon Table</span>
            </div>
        </>
    );
}
