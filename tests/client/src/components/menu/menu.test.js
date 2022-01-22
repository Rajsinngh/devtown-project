/**
 * @jest-environment jsdom
 */
import React from 'react';
import { shallow } from 'enzyme';
import toJson from "enzyme-to-json";
import { Menu } from '../../../../../client/src/components/menu/menu'

jest.useFakeTimers();
describe('The Menu component', () => {
    let props;
    beforeEach(() => {
        props = {
            user: {
                authenticated: true,
                displayname: 'tester displayname',
                username: 'tester username',
                service: 'tester service',
                userID: 'tester user Id'
            },
            search: null,
            location: {
                pathname: "/",
            },
            getUser: jest.fn(),
            updateSearch: jest.fn()
        }
    })
    afterEach(() => {
        props = null
        jest.clearAllMocks()
    })
    test('will render for an authenticated user', () => {
        const wrapper = shallow(<Menu {...props} />)
        wrapper.setState({ ready: true })
        const cover = wrapper.find('Cover');
        expect(cover.length).toBe(0);
        expect(toJson(wrapper)).toMatchSnapshot();
    })
    test('will render for users authenticated as guest', () => {
        const updatedProps = {
            ...props,
            user: {
                ...props.user,
                authenticated: false
            }
        }
        const wrapper = shallow(<Menu {...updatedProps} />)
        wrapper.setState({ ready: true })
        const cover = wrapper.find('Cover');
        expect(cover.length).toBe(0);
        expect(toJson(wrapper)).toMatchSnapshot();
    })
    test('will render the cover for non-authenticated users', () => {
        const updatedProps = {
            ...props,
            user: {
                ...props.user,
                authenticated: false,
                username: undefined
            }
        }
        const wrapper = shallow(<Menu {...updatedProps} />)
        wrapper.setState({ ready: true })
        const cover = wrapper.find('Cover');
        expect(cover.length).toBe(1);
    })
    test('will not render the search bar if not on the Home page', () => {
        const updatedProps = {
            ...props,
            location: {
                pathname: '/anotherPath'
            }
        }
        const wrapper = shallow(<Menu {...updatedProps} />)
        const result = wrapper.instance().renderSearch()
        expect(result).toBe(null)
    })
    test('will update the search in the redux store on change', () => {
        const wrapper = shallow(<Menu {...props} />)
        wrapper.setState({ ready: true })
        const searchInput = wrapper.find('ForwardRef(InputBase)')
        searchInput.props().onChange({ target: { value: 'abc' } })
        jest.advanceTimersByTime(1000);
        expect(props.updateSearch).toHaveBeenCalledWith('abc')
    })
    test('will update the ready state and others on CDU', () => {
        const wrapper = shallow(<Menu {...props} />)
        expect(wrapper.state().ready).toBe(false)
        expect(wrapper.state().initialLoad).toBe(true)
        jest.spyOn(window, 'addEventListener').mockImplementationOnce(() => { });
        wrapper.setState({ collapseToggle: true })
        const prevProps = {
            user: undefined
        }
        const prevState = {
            collapseToggle: false
        }
        wrapper.instance().componentDidUpdate(prevProps, prevState)
        expect(wrapper.state().ready).toBe(true)
        expect(wrapper.state().initialLoad).toBe(false)
        expect(window.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
    })
    test('will togggle the menu collapse', () => {
        const wrapper = shallow(<Menu {...props} />)
        expect(wrapper.state().collapseToggle).toBe(false)
        const e = { target: { closest: jest.fn() } }
        wrapper.instance().listenForOutClicks(e)
        expect(wrapper.state().collapseToggle).toBe(true)
        expect(e.target.closest).toHaveBeenCalledWith('.menu')
    })
})