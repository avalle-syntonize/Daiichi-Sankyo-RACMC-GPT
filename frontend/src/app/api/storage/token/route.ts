import { NextResponse, NextRequest } from 'next/server'
import { UnauthorizedError } from '@/custom/exceptions/unauthorizedError';
import storageService from '@/services/server/storage.service';
import { getSession } from '@/auth.config';


export async function GET(req: NextRequest) {

    try {
        const auth = await getSession();

        if (!auth) {
            throw new UnauthorizedError();
        }

        const response = await storageService.getSasTokenFromServer();

        if (!response) {
            return NextResponse.json({
                sasToken: '',
            }, { status: 404 });
        }

        return NextResponse.json(response);

    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({
                data: null,
                status: "unauthorized",
                errorCode: "unauthorized"
            }, { status: 401 });
        }

        const err = error as Error;

        return NextResponse.json({
            data: null,
            status: err.message,
            errorCode: "internal_error"
        }, { status: 500 });
    }
}